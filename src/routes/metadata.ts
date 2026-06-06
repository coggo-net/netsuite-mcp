import { z } from "zod";
import type { MetadataAPI } from "../api/metadata.ts";
import { defineRoute, type RouteDef } from "./framework.ts";

const rawQuery = z.object({
	raw: z
		.string()
		.optional()
		.describe("Set to 'true' to return the full NetSuite OpenAPI catalog"),
});

export function metadataRoutes(api: MetadataAPI): RouteDef[] {
	return [
		defineRoute({
			method: "get",
			path: "/api/metadata/:recordType",
			operationId: "metadata_get",
			summary: "Get metadata for a NetSuite record type",
			description:
				"Return field metadata for a NetSuite record type by calling NetSuite's metadata-catalog endpoint. Useful for discovering: (1) which fields are valid in the Record API `q` parameter — see `filterable` (NetSuite's `x-ns-filterable` array; if empty, the record does not support `q`-based filtering and you must use SuiteQL or a dedicated endpoint); (2) what fields exist on the record and their types. Pass `raw=true` to get NetSuite's full OpenAPI/swagger document for that record type instead of the digest.",
			query: rawQuery,
			handler: async ({ query, params }) => {
				if (query.raw === "true") return api.getRaw(params.recordType);
				return api.get(params.recordType);
			},
		}),
	];
}
