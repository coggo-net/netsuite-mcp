import type { NetSuiteClient } from "../netsuite-client.ts";

interface SwaggerSchema {
	type?: string;
	properties?: Record<
		string,
		{
			title?: string;
			type?: string;
			description?: string;
			enum?: unknown[];
			format?: string;
			$ref?: string;
		}
	>;
	"x-ns-filterable"?: string[];
}

interface Catalog {
	components?: { schemas?: Record<string, SwaggerSchema> };
}

export interface MetadataDigest {
	recordType: string;
	filterable: string[];
	fields: {
		name: string;
		title?: string;
		type?: string;
		description?: string;
	}[];
}

export function registerMetadataAPI(client: NetSuiteClient) {
	const fetchCatalog = async (recordType: string): Promise<Catalog> => {
		const res = await client.fetchRaw(
			"GET",
			`/record/v1/metadata-catalog/${recordType}`,
			{ headers: { Accept: "application/swagger+json" } },
		);
		return (await res.json()) as Catalog;
	};

	return {
		async getRaw(recordType: string): Promise<unknown> {
			return fetchCatalog(recordType);
		},

		async get(recordType: string): Promise<MetadataDigest> {
			const catalog = await fetchCatalog(recordType);
			const schema = catalog.components?.schemas?.[recordType] ?? {};
			const props = schema.properties ?? {};
			const fields = Object.entries(props).map(([name, p]) => ({
				name,
				title: p?.title,
				type: p?.type ?? (p?.$ref ? "reference" : undefined),
				description: p?.description,
			}));
			return {
				recordType,
				filterable: schema["x-ns-filterable"] ?? [],
				fields,
			};
		},
	};
}

export type MetadataAPI = ReturnType<typeof registerMetadataAPI>;
