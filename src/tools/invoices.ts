import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { InvoiceAPI } from "../api/invoices.ts";
import { err, ok } from "./helpers.ts";

export function registerInvoiceTools(server: McpServer, api: InvoiceAPI) {
	server.tool(
		"invoice_list",
		"List invoices from NetSuite via Record API GET. Use q for NetSuite filter expressions, and limit/offset for pagination.",
		{
			q: z
				.string()
				.optional()
				.describe(
					'Optional NetSuite Record API filter expression, e.g. tranId CONTAIN "INV"',
				),
			limit: z.number().optional().describe("Max records to return"),
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
		"invoice_get",
		"Get a single invoice by internal ID. Returns all fields including line items, amounts (total, taxTotal, amountPaid), entity, dates, shipping info, and custom fields.",
		{ id: z.string().describe("Invoice internal ID") },
		async ({ id }) => {
			try {
				return ok(await api.get(id));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"invoice_search",
		"Search invoices by transaction ID keyword (e.g. 'INV002' to find matching invoices).",
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
		"invoice_get_overdue",
		"Get all overdue invoices — invoices with unpaid balance where due date is past. Returns id, tranId, tranDate, entity, total, foreignAmountUnpaid, dueDate ordered by due date ascending.",
		{
			limit: z
				.number()
				.optional()
				.describe("Max records to return (default 100)"),
		},
		async ({ limit }) => {
			try {
				return ok(await api.getOverdue(limit));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"invoice_create",
		`Create a new invoice in NetSuite.

Key fields:
- entity (object): {id: "..."} — customer. Required.
- subsidiary (object): {id: "1"} — subsidiary.
- tranDate (string): Invoice date, YYYY-MM-DD.
- dueDate (string): Payment due date, YYYY-MM-DD.
- memo (string): Invoice memo.
- currency (object): {id: "..."} — currency.
- exchangeRate (number): Exchange rate.
- createdFrom (object): {id: "..."} — source sales order / PI ID. Links invoice to a SO.
- department (object): {id: "..."} — department.
- location (object): {id: "..."} — location.
- salesRep (object): {id: "..."} — sales rep.
- terms (object): {id: "..."} — payment terms.
- account (object): {id: "..."} — A/R account.
- item (object): Line items array. Each line has:
  - item (object): {id: "..."} — item. Required.
  - quantity (number): Quantity. Required.
  - rate (number): Unit price.
  - amount (number): Line total.
  - description (string): Line description.
  - taxCode (object): {id: "..."} — tax code.

Example — create invoice from a sales order:
{
  "entity": {"id": "1023"},
  "createdFrom": {"id": "29410"},
  "tranDate": "2026-05-08",
  "dueDate": "2026-06-07",
  "memo": "Invoice for PI001808"
}

Example — create standalone invoice:
{
  "entity": {"id": "1023"},
  "subsidiary": {"id": "1"},
  "tranDate": "2026-05-08",
  "dueDate": "2026-06-07",
  "currency": {"id": "1"},
  "item": {"items": [
    {"item": {"id": "225"}, "quantity": 50, "rate": 12.50}
  ]}
}`,
		{
			data: z
				.record(z.string(), z.unknown())
				.describe(
					"Invoice fields — see tool description for available fields and examples",
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
		"invoice_update",
		`Update an existing invoice by internal ID. Only provided header fields are updated (PATCH).

Updatable fields: memo, dueDate, exchangeRate, department, location, salesRep, terms,
and all other header fields.

Sublist replace semantics: if you include the item sublist, it FULLY REPLACES the
existing line items — you must provide the complete set of lines you want to keep, not
just the changed ones. Omit item entirely to leave existing lines untouched.

Example — header-only change: {"memo": "Updated", "dueDate": "2026-07-01"}
Example — replace all lines: {"item": {"items": [{"item": {"id": "225"}, "quantity": 50, "rate": 12.50}]}}`,
		{
			id: z.string().describe("Invoice internal ID"),
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
		"invoice_add_lines",
		`Append NEW line items to an existing invoice WITHOUT replacing the existing lines.

Use this instead of invoice_update when you only want to ADD lines. invoice_update
sends the full item sublist with ?replace=item, which re-issues every existing line's
lot allocation — on a lot-tracked invoice that re-allocates stock and fails once a
prior update has committed lots ("You only have N available"). This tool uses
NetSuite's PATCH merge mode: the lines you send are appended, and existing lines plus
their committed lot assignments are left untouched.

Provide ONLY the new lines. Each line has the same shape as invoice_create lines:
- item (object): {id: "..."} — required.
- quantity (number): required.
- rate (number), amount (number), description (string), taxCode {id}, etc.
- location (object): {id: "..."} — needed for lot auto-assignment.
- inventoryDetail (object): explicit lot/serial assignment for the new line. Omit to
  let the API FIFO-auto-assign across available lots (requires a line-level location).

Example — add two lot-tracked lines:
{
  "id": "<invoiceId>",
  "lines": [
    {"item": {"id": "1662"}, "quantity": 1, "rate": 2300, "location": {"id": "1"}}
  ]
}`,
		{
			id: z.string().describe("Invoice internal ID"),
			lines: z
				.array(z.record(z.string(), z.unknown()))
				.describe("New line items to append — see tool description"),
		},
		async ({ id, lines }) => {
			try {
				return ok(await api.addLines(id, lines));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"invoice_delete",
		"Delete an invoice by internal ID. This action is irreversible.",
		{ id: z.string().describe("Invoice internal ID") },
		async ({ id }) => {
			try {
				return ok(await api.delete(id));
			} catch (e) {
				return err(e);
			}
		},
	);
}
