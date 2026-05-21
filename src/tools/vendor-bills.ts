import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { VendorBillAPI } from "../api/vendor-bills.ts";
import { err, ok } from "./helpers.ts";

export function registerVendorBillTools(server: McpServer, api: VendorBillAPI) {
	server.tool(
		"vendor_bill_list",
		"List vendor bills (supplier invoices) from NetSuite. Returns paginated vendor bill records.",
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
		"vendor_bill_get",
		"Get a single vendor bill by internal ID. Returns all fields including vendor (entity), line items, amounts (total, taxTotal, amountPaid), dates, account, and custom fields.",
		{ id: z.string().describe("Vendor bill internal ID") },
		async ({ id }) => {
			try {
				return ok(await api.get(id));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"vendor_bill_search",
		"Search vendor bills by transaction ID keyword (matches the supplier invoice reference number).",
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
		"vendor_bill_search_sql",
		"Query vendor bills using SuiteQL. Available columns: id, tranId, tranDate, entity, status, total, foreignAmountUnpaid, dueDate, memo. Status A=Open, B=Paid In Full.",
		{
			where: z
				.string()
				.describe(
					"SuiteQL WHERE clause, e.g. \"foreignAmountUnpaid > 0 AND entity = '265'\"",
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
		"vendor_bill_get_overdue",
		"Get all overdue vendor bills — bills with unpaid balance where due date is past. Returns id, tranId, tranDate, entity, total, foreignAmountUnpaid, dueDate ordered by due date ascending.",
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
		"vendor_bill_create",
		`Create a new vendor bill (supplier invoice) in NetSuite.

Key fields:
- entity (object): {id: "..."} — vendor. Required.
- subsidiary (object): {id: "1"} — subsidiary.
- tranId (string): Supplier's invoice reference number.
- tranDate (string): Bill date, YYYY-MM-DD.
- dueDate (string): Payment due date, YYYY-MM-DD.
- memo (string): Bill memo.
- currency (object): {id: "..."} — currency.
- exchangeRate (number): Exchange rate.
- createdFrom (object): {id: "..."} — source PO ID. Links bill to a PO.
- department (object): {id: "..."} — department.
- location (object): {id: "..."} — location.
- terms (object): {id: "..."} — payment terms.
- account (object): {id: "..."} — A/P account.
- userTotal (number): Vendor-provided total, used to verify line totals.
- item (object): Line items array. Each line has:
  - item (object): {id: "..."} — item. Required.
  - quantity (number): Quantity. Required.
  - rate (number): Unit cost.
  - amount (number): Line total.
  - description (string): Line description.
  - taxCode (object): {id: "..."} — tax code.

Example — bill linked to a PO (line items auto-populated from PO):
{
  "entity": {"id": "265"},
  "createdFrom": {"id": "4124"},
  "tranId": "SUP-INV-2026-0042",
  "tranDate": "2026-05-15",
  "dueDate": "2026-06-14",
  "memo": "Supplier invoice for PO000123"
}

Example — standalone bill:
{
  "entity": {"id": "265"},
  "subsidiary": {"id": "1"},
  "tranId": "SUP-INV-2026-0043",
  "tranDate": "2026-05-15",
  "dueDate": "2026-06-14",
  "currency": {"id": "1"},
  "item": {"items": [
    {"item": {"id": "225"}, "quantity": 100, "rate": 10.00}
  ]}
}`,
		{
			data: z
				.record(z.string(), z.unknown())
				.describe(
					"Vendor bill fields — see tool description for available fields and examples",
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
		"vendor_bill_create_from_po",
		`Create a vendor bill by transforming a purchase order. NetSuite populates vendor, line items, and amounts from the PO; override only the header fields you need.

Fields:
- purchaseOrderId (string): Source PO internal ID. Required.
- tranId (string): Supplier's invoice reference number.
- tranDate (string): Bill date, YYYY-MM-DD.
- dueDate (string): Payment due date, YYYY-MM-DD.
- memo (string): Bill memo.
- userTotal (number): Vendor-provided total, used to verify line totals.

Example:
{
  "purchaseOrderId": "4124",
  "tranId": "SUP-INV-2026-0042",
  "tranDate": "2026-05-15",
  "dueDate": "2026-06-14",
  "memo": "Supplier invoice for PO000123",
  "userTotal": 5250.00
}`,
		{
			purchaseOrderId: z.string().describe("Source purchase order internal ID"),
			data: z
				.record(z.string(), z.unknown())
				.optional()
				.describe(
					"Optional header overrides (tranId, tranDate, dueDate, memo, userTotal)",
				),
		},
		async ({ purchaseOrderId, data }) => {
			try {
				return ok(
					await api.createFromPurchaseOrder(purchaseOrderId, data ?? {}),
				);
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"vendor_bill_update",
		`Update an existing vendor bill by internal ID. Only provided header fields are updated (PATCH).

Updatable fields: memo, dueDate, exchangeRate, department, location, terms, account,
tranId, and all other header fields.

Sublist replace semantics: if you include a sublist (item, expense), it FULLY REPLACES
the existing sublist — you must provide the complete set of lines you want to keep, not
just the changed ones. Omit the sublist entirely to leave existing lines untouched.

Example — header-only change: {"memo": "Updated", "dueDate": "2026-07-01"}
Example — replace all lines: {"item": {"items": [{"item": {"id": "225"}, "quantity": 6, "rate": 2610.09}]}}`,
		{
			id: z.string().describe("Vendor bill internal ID"),
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
		"vendor_bill_delete",
		"Delete a vendor bill by internal ID. This action is irreversible.",
		{ id: z.string().describe("Vendor bill internal ID") },
		async ({ id }) => {
			try {
				return ok(await api.delete(id));
			} catch (e) {
				return err(e);
			}
		},
	);
}
