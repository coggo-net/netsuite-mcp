import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { PurchaseOrderAPI } from "../api/purchase-orders.ts";
import { err, ok } from "./helpers.ts";

export function registerPurchaseOrderTools(
	server: McpServer,
	api: PurchaseOrderAPI,
) {
	server.tool(
		"purchase_order_list",
		"List purchase orders from NetSuite. Returns paginated purchase order records.",
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
		"purchase_order_get",
		"Get a single purchase order by internal ID. Returns all fields including vendor (entity), line items, amounts, shipping details, approval status, and custom fields.",
		{ id: z.string().describe("Purchase order internal ID") },
		async ({ id }) => {
			try {
				return ok(await api.get(id));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"purchase_order_search",
		"Search purchase orders by transaction ID keyword (e.g. 'PO000' to find matching POs).",
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
		"purchase_order_search_sql",
		"Query purchase orders using SuiteQL. Available columns: id, tranId, tranDate, entity, status, total, memo. Status codes: B=Pending Receipt, G=Fully Received, H=Closed.",
		{
			where: z
				.string()
				.describe(
					"SuiteQL WHERE clause, e.g. \"status = 'B' AND total > 5000\"",
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
		"purchase_order_create",
		`Create a new purchase order in NetSuite.

Key fields:
- entity (object): {id: "..."} — vendor. Required.
- subsidiary (object): {id: "1"} — subsidiary.
- tranDate (string): PO date, YYYY-MM-DD.
- dueDate (string): Expected delivery date, YYYY-MM-DD.
- memo (string): PO memo/notes.
- currency (object): {id: "..."} — currency.
- exchangeRate (number): Exchange rate.
- location (object): {id: "..."} — receiving location.
- department (object): {id: "..."} — department.
- employee (object): {id: "..."} — purchaser.
- terms (object): {id: "..."} — payment terms.
- shipDate (string): Expected ship date.
- item (object): Line items array. Each line has:
  - item (object): {id: "..."} — item. Required.
  - quantity (number): Quantity to order. Required.
  - rate (number): Unit cost.
  - amount (number): Line total.
  - description (string): Line description.
  - location (object): {id: "..."} — line receiving location.
  - expectedReceiptDate (string): Per-line expected receipt date.

Example:
{
  "entity": {"id": "265"},
  "subsidiary": {"id": "1"},
  "tranDate": "2026-05-08",
  "memo": "PI202508-001",
  "currency": {"id": "1"},
  "location": {"id": "1"},
  "item": {"items": [
    {"item": {"id": "225"}, "quantity": 500, "rate": 10.00},
    {"item": {"id": "226"}, "quantity": 300, "rate": 7.50}
  ]}
}`,
		{
			data: z
				.record(z.string(), z.unknown())
				.describe(
					"Purchase order fields — see tool description for available fields and examples",
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
		"purchase_order_update",
		`Update an existing purchase order by internal ID. Only provided header fields are updated (PATCH).

Updatable fields: memo, dueDate, shipDate, exchangeRate, location, department, employee,
terms, and all other header fields.

Sublist replace semantics: if you include the item sublist, it FULLY REPLACES the
existing line items — you must provide the complete set of lines you want to keep, not
just the changed ones. Omit item entirely to leave existing lines untouched.

Example — header-only change: {"memo": "Updated PO", "dueDate": "2026-06-15"}`,
		{
			id: z.string().describe("Purchase order internal ID"),
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
		"purchase_order_delete",
		"Delete a purchase order by internal ID. This action is irreversible.",
		{ id: z.string().describe("Purchase order internal ID") },
		async ({ id }) => {
			try {
				return ok(await api.delete(id));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"purchase_order_receive",
		`Create an item receipt to record physical receipt of goods against a purchase order.

Key fields:
- createdFrom (object): {id: "..."} — source purchase order ID. Required.
- tranDate (string): Receipt date, YYYY-MM-DD.
- memo (string): Receipt notes.
- item (object): Line items specifying quantities received. Each line:
  - item (object): {id: "..."} — item being received.
  - quantity (number): Quantity received.
  - location (object): {id: "..."} — receiving location.

Example:
{
  "createdFrom": {"id": "4124"},
  "tranDate": "2026-05-08",
  "memo": "Partial receipt",
  "item": {"items": [
    {"item": {"id": "225"}, "quantity": 200, "location": {"id": "1"}}
  ]}
}`,
		{
			data: z
				.record(z.string(), z.unknown())
				.describe(
					"Item receipt data — see tool description for fields and example",
				),
		},
		async ({ data }) => {
			try {
				return ok(await api.receive(data));
			} catch (e) {
				return err(e);
			}
		},
	);
}
