import type { InvoiceAPI } from "../api/invoices.ts";
import {
	defineRoute,
	limitQuery,
	paginationQuery,
	type RouteDef,
	searchQuery,
} from "./framework.ts";
import { invoiceBody, invoiceBodyPartial, lineItems } from "./schemas.ts";

export function invoiceRoutes(api: InvoiceAPI): RouteDef[] {
	return [
		defineRoute({
			method: "get",
			path: "/api/invoices",
			operationId: "invoice_list",
			summary: "List invoices",
			description:
				"List invoices from NetSuite. Returns paginated invoice records.",
			query: paginationQuery,
			handler: async ({ query }) => api.list(query),
		}),
		defineRoute({
			method: "get",
			path: "/api/invoices/search",
			operationId: "invoice_search",
			summary: "Search invoices by transaction ID",
			description:
				"Search invoices by transaction ID keyword (e.g. 'INV002' to find matching invoices).",
			query: searchQuery,
			handler: async ({ query }) =>
				api.search(query.keyword, { limit: query.limit }),
		}),
		defineRoute({
			method: "get",
			path: "/api/invoices/overdue",
			operationId: "invoice_get_overdue",
			summary: "Get overdue invoices",
			description:
				"Get all overdue invoices — invoices with unpaid balance where due date is past. Returns id, tranId, tranDate, entity, total, foreignAmountUnpaid, dueDate ordered by due date ascending.",
			query: limitQuery,
			handler: async ({ query }) => api.getOverdue(query.limit),
		}),
		defineRoute({
			method: "get",
			path: "/api/invoices/:id",
			operationId: "invoice_get",
			summary: "Get an invoice by ID",
			description:
				"Get a single invoice by internal ID. Returns all fields including line items, amounts (total, taxTotal, amountPaid), entity, dates, shipping info, and custom fields.",
			handler: async ({ params }) => api.get(params.id),
		}),
		defineRoute({
			method: "post",
			path: "/api/invoices",
			operationId: "invoice_create",
			summary: "Create an invoice",
			description: "Create a new invoice in NetSuite.",
			body: invoiceBody,
			successStatus: 201,
			handler: async ({ body }) => api.create(body),
		}),
		defineRoute({
			method: "patch",
			path: "/api/invoices/:id",
			operationId: "invoice_update",
			summary: "Update an invoice",
			description:
				"Update an existing invoice by internal ID (PATCH). Only provided header fields are updated. If the item sublist is included, it FULLY REPLACES the existing line items — provide the complete set of lines you want to keep. Omit item to leave existing lines untouched.",
			body: invoiceBodyPartial,
			handler: async ({ params, body }) => api.update(params.id, body),
		}),
		defineRoute({
			method: "post",
			path: "/api/invoices/:id/lines",
			operationId: "invoice_add_lines",
			summary: "Append line items to an invoice",
			description:
				"Append NEW line items to an existing invoice WITHOUT replacing the existing item sublist (NetSuite PATCH merge mode). Send only the lines you want to add. Existing lines — and their committed lot allocations — are left untouched, so this avoids the stock re-allocation failures that invoice_update (full sublist replace) hits on lot-tracked invoices. Lots for the new lines are FIFO-auto-assigned when inventoryDetail is omitted (a line-level location is required for auto-assign, same as PI/SO); otherwise provide inventoryDetail explicitly for the new lines only.",
			body: lineItems,
			successStatus: 200,
			handler: async ({ params, body }) => api.addLines(params.id, body.items),
		}),
		defineRoute({
			method: "delete",
			path: "/api/invoices/:id",
			operationId: "invoice_delete",
			summary: "Delete an invoice",
			description:
				"Delete an invoice by internal ID. This action is irreversible.",
			handler: async ({ params }) => api.delete(params.id),
		}),
	];
}
