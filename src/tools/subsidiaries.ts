import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { SubsidiaryAPI } from "../api/subsidiaries.ts";
import { err, ok } from "./helpers.ts";

export function registerSubsidiaryTools(server: McpServer, api: SubsidiaryAPI) {
	server.tool(
		"subsidiary_list",
		"List subsidiaries from NetSuite via Record API GET. OneWorld accounts only. Returns paginated subsidiary records (id, links). Use q for NetSuite filter expressions, and limit/offset for pagination.",
		{
			q: z
				.string()
				.optional()
				.describe(
					'Optional NetSuite Record API filter expression, e.g. name CONTAIN "Singapore"',
				),
			limit: z
				.number()
				.optional()
				.describe("Max records to return (default 100)"),
			offset: z.number().optional().describe("Pagination offset"),
		},
		async ({ q, limit, offset }) => {
			try {
				return ok(await api.list({ q, limit, offset }));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"subsidiary_get",
		"Get a single subsidiary by internal ID. Returns name, legalName, country, state, currency, parent subsidiary, tax IDs, addresses, and flags.",
		{ id: z.string().describe("Subsidiary internal ID") },
		async ({ id }) => {
			try {
				return ok(await api.get(id));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"subsidiary_search",
		"Search subsidiaries by name keyword. Uses NetSuite's CONTAIN operator on the `name` field.",
		{
			keyword: z.string().describe("Subsidiary name keyword to search"),
			limit: z.number().optional().describe("Max records to return"),
		},
		async ({ keyword, limit }) => {
			try {
				return ok(await api.search(keyword, { limit }));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"subsidiary_create",
		`Create a new subsidiary in NetSuite. Only works on OneWorld accounts and typically requires administrator role.

Key fields:
- name (string): Subsidiary display name. Required.
- legalName (string): Legal name as shown on tax forms.
- country (object): {id: "<ISO-3166-1 alpha-2>"} — e.g. {id: "SG"}, {id: "US"}, {id: "MY"}.
- state (string): State / province.
- currency (object): {id: "1"} — base currency.
- parent (object): {id: "..."} — parent subsidiary.
- email, fax, url (string): Contact info.
- federalIdNumber (string): Tax ID — US EIN, Australian ABN, UK / other VAT registration number, etc.
- isElimination (boolean): Mark as an elimination subsidiary for intercompany consolidation.
- isInactive (boolean): Defaults to false.

Example:
{
  "name": "Rejo Beverages Pte Ltd",
  "legalName": "Rejo Beverages Pte Ltd",
  "country": {"id": "SG"},
  "currency": {"id": "1"},
  "parent": {"id": "1"}
}`,
		{
			data: z
				.record(z.string(), z.unknown())
				.describe(
					"Subsidiary record fields — see tool description for available fields and examples",
				),
		},
		async ({ data }) => {
			try {
				return ok(await api.create(data));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"subsidiary_update",
		`Update an existing subsidiary by internal ID (PATCH). Only provided fields are updated.

Updatable fields include any of those listed in subsidiary_create. Reference fields use {id: "..."} format.

Example: {"legalName": "New Legal Name", "email": "info@subsidiary.com"}`,
		{
			id: z.string().describe("Subsidiary internal ID"),
			data: z
				.record(z.string(), z.unknown())
				.describe(
					"Fields to update — see tool description for available fields",
				),
		},
		async ({ id, data }) => {
			try {
				return ok(await api.update(id, data));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"subsidiary_delete",
		"Delete a subsidiary by internal ID. This action is irreversible and will fail if any records reference the subsidiary. Strongly prefer setting isInactive: true via subsidiary_update.",
		{ id: z.string().describe("Subsidiary internal ID") },
		async ({ id }) => {
			try {
				return ok(await api.delete(id));
			} catch (e) {
				return err(e);
			}
		},
	);
}
