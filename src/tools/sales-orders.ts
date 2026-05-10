import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ProformaInvoiceAPI } from "../api/proforma-invoices.ts";
import type { SalesOrderAPI } from "../api/sales-orders.ts";
import { err, ok } from "./helpers.ts";

export function registerSalesOrderTools(
	server: McpServer,
	api: SalesOrderAPI,
	piApi: ProformaInvoiceAPI,
) {
	server.tool(
		"sales_order_list",
		"List sales orders from NetSuite. In this account, sales orders include Pro-Forma Invoices (PI). Returns paginated records.",
		{
			limit: z.number().optional().describe("Max records to return"),
			offset: z.number().optional().describe("Pagination offset"),
		},
		async ({ limit, offset }) => {
			try {
				return ok(await api.list({ limit, offset }));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"sales_order_get",
		"Get a single sales order / Pro-Forma Invoice by internal ID. Returns all fields including line items, entity, status, amounts, shipping info, and custom fields.",
		{ id: z.string().describe("Sales order internal ID") },
		async ({ id }) => {
			try {
				return ok(await api.get(id));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"sales_order_search",
		"Search sales orders by transaction ID keyword (e.g. 'PI001' to find Pro-Forma Invoices).",
		{
			keyword: z.string().describe("Transaction ID keyword to search"),
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
		"sales_order_search_sql",
		"Query sales orders using SuiteQL. Available columns: id, tranId, tranDate, entity, status, total, memo. Status codes: B=Pending Fulfillment, G=Billed, H=Closed.",
		{
			where: z
				.string()
				.describe(
					"SuiteQL WHERE clause, e.g. \"tranId LIKE 'PI%' AND status = 'B'\"",
				),
			limit: z.number().optional().describe("Max records (default 100)"),
		},
		async ({ where, limit }) => {
			try {
				return ok(await api.searchBySQL(where, limit));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"sales_order_create",
		`Create a new sales order or Pro-Forma Invoice (PI) in NetSuite.

Key fields:
- entity (object): {id: "..."} — customer. Required.
- subsidiary (object): {id: "1"} — subsidiary.
- tranDate (string): Transaction date, YYYY-MM-DD.
- memo (string): Memo/notes.
- currency (object): {id: "..."} — transaction currency.
- exchangeRate (number): Exchange rate to base currency.
- location (object): {id: "..."} — warehouse location.
- department (object): {id: "..."} — department.
- salesRep (object): {id: "..."} — sales representative.
- customForm (object): {id: "..."} — use PI-specific form ID for Pro-Forma Invoices.
- shipDate (string): Expected ship date, YYYY-MM-DD.
- terms (object): {id: "..."} — payment terms.
- item (object): Line items array. Each line has:
  - item (object): {id: "..."} — inventory item. Required.
  - quantity (number): Quantity ordered. Required.
  - rate (number): Unit price. Optional (uses item price if omitted).
  - amount (number): Line total. Optional (auto-calculated).
  - description (string): Line description override.
  - location (object): {id: "..."} — line-level location.
  - taxCode (object): {id: "..."} — tax code.

Example — create a Pro-Forma Invoice:
{
  "entity": {"id": "1023"},
  "subsidiary": {"id": "1"},
  "tranDate": "2026-05-08",
  "memo": "OO6D663041Q",
  "currency": {"id": "1"},
  "location": {"id": "1"},
  "item": {"items": [
    {"item": {"id": "225"}, "quantity": 100, "rate": 12.50},
    {"item": {"id": "226"}, "quantity": 200, "rate": 8.00}
  ]}
}`,
		{
			data: z
				.record(z.string(), z.unknown())
				.describe(
					"Sales order / PI fields — see tool description for available fields and examples",
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
		"sales_order_update",
		`Update an existing sales order / Pro-Forma Invoice. Only provided fields are updated (PATCH).

Updatable fields: memo, shipDate, exchangeRate, location, department, salesRep, terms, and
all other header fields. To update line items, provide the full item array.

Example: {"memo": "Updated memo", "shipDate": "2026-06-01"}`,
		{
			id: z.string().describe("Sales order internal ID"),
			data: z
				.record(z.string(), z.unknown())
				.describe("Fields to update — see tool description"),
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
		"sales_order_delete",
		"Delete a sales order / Pro-Forma Invoice by internal ID. This action is irreversible.",
		{ id: z.string().describe("Sales order internal ID") },
		async ({ id }) => {
			try {
				return ok(await api.delete(id));
			} catch (e) {
				return err(e);
			}
		},
	);

	// ─── Pro-Forma Invoices (convenience layer over sales orders) ──

	server.tool(
		"pi_list_recent",
		"List recent Pro-Forma Invoices ordered by date descending. Returns tranId (e.g. PI001809), tranDate, entity, status, total, and memo via SuiteQL.",
		{
			limit: z
				.number()
				.optional()
				.describe("Max records to return (default 20)"),
		},
		async ({ limit }) => {
			try {
				return ok(await piApi.listRecent(limit));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"pi_search_sql",
		"Query Pro-Forma Invoices using SuiteQL. Available columns: id, tranId, tranDate, entity, status, total, memo, dueDate. Status codes: B=Pending Fulfillment, G=Billed, H=Closed.",
		{
			where: z
				.string()
				.describe(
					"SuiteQL WHERE clause, e.g. \"status = 'B' AND total > 10000\"",
				),
			limit: z.number().optional().describe("Max records (default 100)"),
		},
		async ({ where, limit }) => {
			try {
				return ok(await piApi.searchBySQL(where, limit));
			} catch (e) {
				return err(e);
			}
		},
	);
}
