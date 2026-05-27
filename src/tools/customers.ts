import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CustomerAPI } from "../api/customers.ts";
import { err, ok } from "./helpers.ts";

export function registerCustomerTools(server: McpServer, api: CustomerAPI) {
	server.tool(
		"customer_list",
		"List customers from NetSuite via Record API GET. Returns paginated customer records with basic info (id, links). Use q for NetSuite filter expressions, and limit/offset for pagination.",
		{
			q: z
				.string()
				.optional()
				.describe(
					'Optional NetSuite Record API filter expression, e.g. companyName CONTAIN "WINE"',
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
		"customer_get",
		"Get a single customer record by internal ID. Returns all fields including company name, contact info, balance, addresses, currency settings, and custom fields.",
		{ id: z.string().describe("Customer internal ID") },
		async ({ id }) => {
			try {
				return ok(await api.get(id));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"customer_search",
		"Search customers by company name keyword. Uses NetSuite's CONTAIN operator to match partial company names.",
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
		"customer_create",
		`Create a new customer record in NetSuite.

Key fields:
- companyName (string): Legal company name. Required for company customers.
- isPerson (boolean): true for individual, false for company.
- firstName, lastName (string): Required if isPerson is true.
- subsidiary (object): {id: "1"} — reference to subsidiary. Required.
- email (string): Primary email address.
- phone (string): Primary phone number.
- entityId (string): Customer ID/number. Auto-generated if omitted.
- currency (object): {id: "1"} — primary currency.
- terms (object): {id: "1"} — payment terms.
- category (object): {id: "1"} — customer category.
- salesRep (object): {id: "1"} — assigned sales rep (employee).
- creditLimit (number): Credit limit amount.
- taxable (boolean): Whether customer pays sales tax.
- isInactive (boolean): Defaults to false.
- addressBook (object): Address book sublist. Nested shape:
    {"items": [
      {
        "defaultBilling": true,
        "defaultShipping": true,
        "label": "Main",
        "addressBookAddress": {
          "addr1": "...", "addr2": "...", "city": "...",
          "state": "...", "zip": "...", "country": "<ISO-3166-1 alpha-2>"
        }
      }
    ]}

Example — create a company customer:
{
  "companyName": "Acme Trading Ltd",
  "subsidiary": {"id": "1"},
  "email": "info@acme.com",
  "phone": "+65-1234-5678",
  "currency": {"id": "1"},
  "terms": {"id": "2"},
  "taxable": true
}

Example — create an individual customer:
{
  "isPerson": true,
  "firstName": "John",
  "lastName": "Doe",
  "subsidiary": {"id": "1"},
  "email": "john@example.com"
}`,
		{
			data: z
				.record(z.string(), z.unknown())
				.describe(
					"Customer record fields — see tool description for available fields and examples",
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
		"customer_update",
		`Update an existing customer record by internal ID. Only provided fields are updated (PATCH).

Updatable fields include: companyName, firstName, lastName, email, phone, fax, url, comments,
creditLimit, taxable, isInactive, terms, salesRep, category, currency, subsidiary, and all
other fields listed in customer_create. Reference fields use {id: "..."} format.

Example: {"email": "new@example.com", "creditLimit": 50000, "terms": {"id": "3"}}`,
		{
			id: z.string().describe("Customer internal ID"),
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
		"customer_delete",
		"Delete a customer record by internal ID. This action is irreversible.",
		{ id: z.string().describe("Customer internal ID") },
		async ({ id }) => {
			try {
				return ok(await api.delete(id));
			} catch (e) {
				return err(e);
			}
		},
	);
}
