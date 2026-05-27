import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ProformaInvoiceAPI } from "../api/proforma-invoices.ts";
import type { SalesOrderAPI } from "../api/sales-orders.ts";
import { salesOrderBody, salesOrderBodyPartial } from "../routes/schemas.ts";
import { err, ok } from "./helpers.ts";

export function registerSalesOrderTools(
	server: McpServer,
	api: SalesOrderAPI,
	piApi: ProformaInvoiceAPI,
) {
	server.tool(
		"sales_order_list",
		"List sales orders from NetSuite via Record API GET. In this account, sales orders include Pro-Forma Invoices (PI). Use q for NetSuite filter expressions, and limit/offset for pagination.",
		{
			q: z
				.string()
				.optional()
				.describe(
					'Optional NetSuite Record API filter expression, e.g. tranId CONTAIN "PI"',
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
  - inventoryDetail (object): For lot/serial-tracked items only. See "Lot assignment" below.

Lot assignment (lot/serial-tracked items):
Sales orders / PIs are OUTBOUND, so each lot assignment uses issueInventoryNumber.id
(the id returned by inventory_search_lot_numbers — NOT the lot text name) to draw down
from existing lots. The schema exposes inventoryDetail as a typed field on each line.
Pass it explicitly when you've picked specific lots. If you OMIT inventoryDetail for a
lot-tracked item, the API layer will auto-assign FIFO from available lots at the line's
location — so a missing inventoryDetail is no longer a silent bug, but pass it explicitly
for traceability when the user has expressed a lot preference. (For inbound transactions
like vendor bills or item receipts, use receiptInventoryNumber instead — see those tools.)

Example — Pro-Forma Invoice with one lot-tracked line:
{
  "entity": {"id": "1023"},
  "subsidiary": {"id": "1"},
  "tranDate": "2026-05-08",
  "memo": "OO6D663041Q",
  "currency": {"id": "1"},
  "location": {"id": "1"},
  "item": {"items": [
    {"item": {"id": "225"}, "quantity": 100, "rate": 12.50},
    {
      "item": {"id": "1886"},
      "quantity": 10,
      "rate": 250,
      "location": {"id": "2"},
      "inventoryDetail": {
        "quantity": 10,
        "inventoryAssignment": {
          "items": [
            {"quantity": 6, "issueInventoryNumber": {"id": "5218"}},
            {"quantity": 4, "issueInventoryNumber": {"id": "5219"}}
          ]
        }
      }
    }
  ]}
}`,
		{
			data: salesOrderBody
				.passthrough()
				.describe(
					"Sales order / PI fields. See tool description for the lot-tracked example. Custom fields (custbody_*) are passed through.",
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
		`Update an existing sales order / Pro-Forma Invoice. Only provided header fields are updated (PATCH).

Updatable fields: memo, shipDate, exchangeRate, location, department, salesRep, terms, and
all other header fields.

Sublist replace semantics: if you include the item sublist, it FULLY REPLACES the
existing line items — you must provide the complete set of lines you want to keep, not
just the changed ones. Omit item entirely to leave existing lines untouched.

When the item array is provided, lot-tracked lines without inventoryDetail are
auto-assigned FIFO. Pass inventoryDetail explicitly to pin specific lots. See
sales_order_create for the full lot-assignment example.

Example — header-only change: {"memo": "Updated memo", "shipDate": "2026-06-01"}`,
		{
			id: z.string().describe("Sales order internal ID"),
			data: salesOrderBodyPartial
				.passthrough()
				.describe("Fields to update — see sales_order_create for shape"),
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
}
