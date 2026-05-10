import { z } from "zod";
import { logger } from "../logger.ts";

// ─── Type-level path param extraction ──────────────────────────────

type ExtractParams<P extends string> =
	P extends `${string}:${infer Param}/${infer Rest}`
		? Param | ExtractParams<`/${Rest}`>
		: P extends `${string}:${infer Param}`
			? Param
			: never;

type ParamsOf<P extends string> = Record<ExtractParams<P>, string>;

// ─── Shared query schemas ──────────────────────────────────────────

export const paginationQuery = z.object({
	limit: z.number().optional().describe("Max records to return"),
	offset: z.number().optional().describe("Pagination offset"),
});

export const searchQuery = z.object({
	keyword: z.string().describe("Keyword to search"),
	limit: z.number().optional().describe("Max records to return"),
});

export const sqlSearchBody = z.object({
	where: z.string().describe("SuiteQL WHERE clause"),
	limit: z.number().optional().describe("Max records (default 100)"),
});

// ─── Route definition ──────────────────────────────────────────────

export interface RouteDef {
	method: "get" | "post" | "patch" | "delete";
	path: string;
	operationId: string;
	summary: string;
	description: string;
	query?: z.ZodObject<Record<string, z.ZodType>>;
	body?: z.ZodType;
	successStatus?: number;
	handler: (ctx: RouteContext) => Promise<unknown>;
}

interface RouteContext {
	query: Record<string, unknown>;
	body: unknown;
	params: Record<string, string>;
}

/**
 * Create a typed route definition. The handler receives:
 * - `query` typed from the Zod query schema
 * - `body` typed from the Zod body schema
 * - `params` typed from the path's `:param` segments
 */
export function defineRoute<
	const Path extends string,
	Q extends z.ZodObject<Record<string, z.ZodType>> | undefined = undefined,
	B extends z.ZodType | undefined = undefined,
>(def: {
	method: "get" | "post" | "patch" | "delete";
	path: Path;
	operationId: string;
	summary: string;
	description: string;
	query?: Q;
	body?: B;
	successStatus?: number;
	handler: (ctx: {
		query: Q extends z.ZodType<infer T> ? T : Record<string, unknown>;
		body: B extends z.ZodType<infer T> ? T : unknown;
		params: ParamsOf<Path>;
	}) => Promise<unknown>;
}): RouteDef {
	// The handler has narrower parameter types than RouteDef (e.g. typed body/params),
	// but this is safe because buildBunRoutes passes correctly-shaped values at runtime.
	return def as unknown as RouteDef;
}

// ─── JSON Schema helpers ───────────────────────────────────────────

interface JsonSchemaProperty {
	type?: string;
	description?: string;
}

interface JsonSchemaObject {
	type?: string;
	properties?: Record<string, JsonSchemaProperty>;
	required?: string[];
}

const querySchemaCache = new WeakMap<
	z.ZodObject<Record<string, z.ZodType>>,
	JsonSchemaObject
>();

function queryJsonSchema(
	schema: z.ZodObject<Record<string, z.ZodType>>,
): JsonSchemaObject {
	let cached = querySchemaCache.get(schema);
	if (!cached) {
		cached = z.toJSONSchema(schema, {
			unrepresentable: "any",
		}) as JsonSchemaObject;
		querySchemaCache.set(schema, cached);
	}
	return cached;
}

// ─── Build Bun routes from definitions ─────────────────────────────

export function buildBunRoutes(defs: RouteDef[]) {
	const routes: Record<
		string,
		Record<string, (req: Request) => Promise<Response>>
	> = {};

	for (const def of defs) {
		const { path } = def;
		if (!routes[path]) routes[path] = {};

		// Pre-compute numeric query fields for coercion
		const numericFields = new Set<string>();
		if (def.query) {
			const qs = queryJsonSchema(def.query);
			for (const [k, v] of Object.entries(qs.properties ?? {})) {
				if (v.type === "number" || v.type === "integer") {
					numericFields.add(k);
				}
			}
		}

		routes[path]![def.method.toUpperCase()] = async (req: Request) => {
			try {
				const url = new URL(req.url);
				const reqParams = (
					req as Request & { params: Record<string, string> }
				).params;

				const query: Record<string, unknown> = {};
				if (def.query) {
					for (const key of Object.keys(def.query.shape)) {
						const val = url.searchParams.get(key);
						if (val != null) {
							query[key] = numericFields.has(key) ? Number(val) : val;
						}
					}
				}

				let bodyData: unknown;
				if (
					def.method !== "get" &&
					req.headers.get("content-type")?.includes("json")
				) {
					bodyData = await req.json();
				}

				const result = await def.handler({
					query,
					body: bodyData,
					params: reqParams,
				});
				return Response.json(result, {
					status: def.successStatus ?? 200,
				});
			} catch (e) {
				const message = e instanceof Error ? e.message : String(e);
				logger.error(
					{ err: e, operationId: def.operationId },
					"api error",
				);
				return Response.json({ error: message }, { status: 500 });
			}
		};
	}

	return routes;
}

// ─── Build OpenAPI spec from definitions ───────────────────────────

export function buildOpenAPISpec(defs: RouteDef[]) {
	const paths: Record<string, Record<string, unknown>> = {};

	for (const def of defs) {
		const openApiPath = def.path.replace(/:(\w+)/g, "{$1}");
		if (!paths[openApiPath]) paths[openApiPath] = {};

		const operation: Record<string, unknown> = {
			operationId: def.operationId,
			summary: def.summary,
			description: def.description,
			responses: {
				[String(def.successStatus ?? 200)]: {
					description: "Successful response",
					content: {
						"application/json": {
							schema: {
								type: "object",
								additionalProperties: true,
							},
						},
					},
				},
			},
		};

		const parameters: unknown[] = [];

		const pathParamMatches = def.path.match(/:(\w+)/g);
		if (pathParamMatches) {
			for (const p of pathParamMatches) {
				parameters.push({
					name: p.slice(1),
					in: "path",
					required: true,
					schema: { type: "string" },
					description: `${p.slice(1)} parameter`,
				});
			}
		}

		if (def.query) {
			const qs = queryJsonSchema(def.query);
			const requiredFields = new Set(qs.required ?? []);
			for (const [key, prop] of Object.entries(qs.properties ?? {})) {
				parameters.push({
					name: key,
					in: "query",
					required: requiredFields.has(key),
					schema: { type: prop.type ?? "string" },
					...(prop.description ? { description: prop.description } : {}),
				});
			}
		}

		if (parameters.length) operation.parameters = parameters;

		if (def.body) {
			operation.requestBody = {
				required: true,
				content: {
					"application/json": {
						schema: z.toJSONSchema(def.body, {
							unrepresentable: "any",
						}),
					},
				},
			};
		} else if (def.method === "post" || def.method === "patch") {
			operation.requestBody = {
				required: true,
				content: {
					"application/json": {
						schema: {
							type: "object",
							additionalProperties: true,
						},
					},
				},
			};
		}

		paths[openApiPath]![def.method] = operation;
	}

	return {
		openapi: "3.1.0",
		info: {
			title: "NetSuite API",
			description:
				"REST API for managing NetSuite records — customers, inventory, sales orders, invoices, purchase orders, and raw SuiteQL queries.",
			version: "1.0.0",
		},
		paths,
	};
}
