import type { VendorBillAPI } from "../api/vendor-bills.ts";
import {
	defineRoute,
	limitQuery,
	paginationQuery,
	type RouteDef,
	searchQuery,
	sqlSearchBody,
} from "./framework.ts";
import {
	vendorBillBody,
	vendorBillBodyPartial,
	vendorBillFromPOBody,
} from "./schemas.ts";

export function vendorBillRoutes(api: VendorBillAPI): RouteDef[] {
	return [
		defineRoute({
			method: "get",
			path: "/api/vendor-bills",
			operationId: "vendor_bill_list",
			summary: "List vendor bills",
			description:
				"List vendor bills (supplier invoices) from NetSuite. Returns paginated vendor bill records.",
			query: paginationQuery,
			handler: async ({ query }) => api.list(query),
		}),
		defineRoute({
			method: "get",
			path: "/api/vendor-bills/search",
			operationId: "vendor_bill_search",
			summary: "Search vendor bills by transaction ID",
			description:
				"Search vendor bills by transaction ID keyword (matches the supplier invoice reference number).",
			query: searchQuery,
			handler: async ({ query }) =>
				api.search(query.keyword, { limit: query.limit }),
		}),
		defineRoute({
			method: "post",
			path: "/api/vendor-bills/search-sql",
			operationId: "vendor_bill_search_sql",
			summary: "Query vendor bills with SuiteQL",
			description:
				"Query vendor bills using SuiteQL. Available columns: id, tranId, tranDate, entity, status, total, foreignAmountUnpaid, dueDate, memo. Status A=Open, B=Paid In Full.",
			body: sqlSearchBody,
			handler: async ({ body }) => api.searchBySQL(body.where, body.limit),
		}),
		defineRoute({
			method: "get",
			path: "/api/vendor-bills/overdue",
			operationId: "vendor_bill_get_overdue",
			summary: "Get overdue vendor bills",
			description:
				"Get all overdue vendor bills — bills with unpaid balance where due date is past. Returns id, tranId, tranDate, entity, total, foreignAmountUnpaid, dueDate ordered by due date ascending.",
			query: limitQuery,
			handler: async ({ query }) => api.getOverdue(query.limit),
		}),
		defineRoute({
			method: "post",
			path: "/api/vendor-bills/from-purchase-order",
			operationId: "vendor_bill_create_from_po",
			summary: "Transform a purchase order into a vendor bill",
			description:
				"Create a vendor bill by transforming a purchase order through NetSuite's purchaseOrder -> vendorBill transform endpoint. NetSuite populates vendor, line items, and amounts from the PO; provide purchaseOrderId as the source purchase order internal ID and override only the header fields you need (tranId for supplier invoice number, tranDate, dueDate, memo, userTotal). Returns the created vendor bill id when NetSuite includes a Location header.",
			body: vendorBillFromPOBody,
			successStatus: 201,
			handler: async ({ body }) => {
				const { purchaseOrderId, ...rest } = body;
				return api.createFromPurchaseOrder(purchaseOrderId, rest);
			},
		}),
		defineRoute({
			method: "get",
			path: "/api/vendor-bills/:id",
			operationId: "vendor_bill_get",
			summary: "Get a vendor bill by ID",
			description:
				"Get a single vendor bill by internal ID. Returns all fields including vendor (entity), line items, amounts (total, taxTotal, amountPaid), dates, account, and custom fields.",
			handler: async ({ params }) => api.get(params.id),
		}),
		defineRoute({
			method: "post",
			path: "/api/vendor-bills",
			operationId: "vendor_bill_create",
			summary: "Create a vendor bill",
			description:
				"Create a new vendor bill (supplier invoice) in NetSuite. Lot/serial-tracked lines: vendor bills are INBOUND, so use receiptInventoryNumber per inventoryAssignment item. Pass {refName: '...'} to auto-create a new lot, or {id: '...'} to bill against an existing one. inventoryDetail.quantity MUST equal the line quantity and the sum of inventoryAssignment.items[].quantity MUST also equal it. Fallback: some NetSuite account configurations reject implicit lot creation on STANDALONE vendor bills (INVALID_VALUE / USER_ERROR), even though the same payload works on item receipts. When that happens, call POST /api/inventory/lots (inventory_lot_create) first to pre-create the inventoryNumber record, then resubmit the bill using receiptInventoryNumber: {id: '<returned-id>'}.",
			body: vendorBillBody,
			successStatus: 201,
			handler: async ({ body }) => api.create(body),
		}),
		defineRoute({
			method: "patch",
			path: "/api/vendor-bills/:id",
			operationId: "vendor_bill_update",
			summary: "Update a vendor bill",
			description:
				"Update an existing vendor bill by internal ID (PATCH). Only provided header fields are updated. If a sublist (item, expense) is included, it FULLY REPLACES the existing sublist — provide the complete set of lines you want to keep. Omit the sublist to leave existing lines untouched.",
			body: vendorBillBodyPartial,
			handler: async ({ params, body }) => api.update(params.id, body),
		}),
		defineRoute({
			method: "delete",
			path: "/api/vendor-bills/:id",
			operationId: "vendor_bill_delete",
			summary: "Delete a vendor bill",
			description:
				"Delete a vendor bill by internal ID. This action is irreversible.",
			handler: async ({ params }) => api.delete(params.id),
		}),
	];
}
