import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { MetadataAPI } from "../api/metadata.ts";
import { err, ok } from "./helpers.ts";

export function registerMetadataTools(server: McpServer, api: MetadataAPI) {
	server.tool(
		"metadata_get",
		"Get NetSuite record metadata for a record type. Returns a digest containing: `filterable` (NetSuite's `x-ns-filterable` array — every field name that is valid in the Record API `q` parameter; empty means `q` is not supported and you should use SuiteQL or a dedicated endpoint), and `fields` (every property with title, type, description). Use this to discover the correct field name before writing a `q` filter, or to inspect a record's schema. Pass `raw: true` to receive NetSuite's full OpenAPI/swagger document for that record type.",
		{
			recordType: z
				.string()
				.describe(
					"Record type (lowerCamelCase), e.g. 'vendor', 'inventoryItem', 'salesOrder', 'vendorBill', 'account', 'location', 'subsidiary'",
				),
			raw: z
				.boolean()
				.optional()
				.describe(
					"If true, return the full NetSuite OpenAPI catalog (large). Default false returns a digest.",
				),
		},
		async ({ recordType, raw }) => {
			try {
				return ok(
					raw ? await api.getRaw(recordType) : await api.get(recordType),
				);
			} catch (e) {
				return err(e);
			}
		},
	);
}
