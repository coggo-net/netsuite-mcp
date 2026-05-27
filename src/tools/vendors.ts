import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { VendorAPI } from "../api/vendors.ts";
import { err, ok } from "./helpers.ts";

export function registerVendorTools(server: McpServer, api: VendorAPI) {
	server.tool(
		"vendor_list",
		"List vendors (suppliers) from NetSuite via Record API GET. Returns paginated vendor records with basic info (id, links). Use q for NetSuite filter expressions, and limit/offset for pagination.",
		{
			q: z
				.string()
				.optional()
				.describe(
					'Optional NetSuite Record API filter expression, e.g. companyName CONTAIN "ACME"',
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
		"vendor_get",
		"Get a single vendor record by internal ID. Returns all fields including companyName, legalName, contact info, balance, currency, terms, subsidiary, payablesAccount, expenseAccount, addressBook, and custom fields.",
		{ id: z.string().describe("Vendor internal ID") },
		async ({ id }) => {
			try {
				return ok(await api.get(id));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"vendor_search",
		"Search vendors by company name keyword. Uses NetSuite's CONTAIN operator on companyName for partial matches. For person-type vendors, search may miss matches — fall back to vendor_list with pagination if needed.",
		{
			keyword: z.string().describe("Company name keyword to search"),
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
		"vendor_create",
		`Create a new vendor (supplier) record in NetSuite.

Key fields:
- companyName (string): Legal company name. Required for company vendors.
- isPerson (boolean): true for individual, false for company.
- firstName, lastName (string): Required if isPerson is true.
- entityId (string): Supplier ID/number. Auto-generated if omitted.
- subsidiary (object): {id: "1"} — primary subsidiary. Required on OneWorld accounts.
- email, phone, fax (string): Contact info.
- currency (object): {id: "1"} — primary currency.
- terms (object): {id: "1"} — payment terms.
- category (object): {id: "1"} — vendor category.
- payablesAccount (object): {id: "..."} — A/P GL account. Use account_search to find by name.
- expenseAccount (object): {id: "..."} — default expense GL account.
- taxIdNum, vatRegNumber (string): Tax IDs.
- is1099Eligible (boolean): Issue 1099 annually.
- isInactive (boolean): Defaults to false.

Example — create a company vendor:
{
  "companyName": "TRINITY SPIRITS PTE LTD",
  "subsidiary": {"id": "1"},
  "email": "ap@trinity.com",
  "phone": "+65-1234-5678",
  "currency": {"id": "1"},
  "terms": {"id": "2"}
}`,
		{
			data: z
				.record(z.string(), z.unknown())
				.describe(
					"Vendor record fields — see tool description for available fields and examples",
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
		"vendor_update",
		`Update an existing vendor record by internal ID. Only provided fields are updated (PATCH).

Updatable fields include any of those listed in vendor_create. Reference fields use {id: "..."} format.

Example: {"email": "new-ap@vendor.com", "terms": {"id": "3"}, "isInactive": true}`,
		{
			id: z.string().describe("Vendor internal ID"),
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
		"vendor_delete",
		"Delete a vendor record by internal ID. This action is irreversible. Prefer setting isInactive: true via vendor_update unless the vendor has no transactions.",
		{ id: z.string().describe("Vendor internal ID") },
		async ({ id }) => {
			try {
				return ok(await api.delete(id));
			} catch (e) {
				return err(e);
			}
		},
	);
}
