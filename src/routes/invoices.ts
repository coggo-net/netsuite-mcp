import type { InvoiceAPI } from "../api/invoices.ts";
import {
	defineRoute,
	limitQuery,
	paginationQuery,
	searchQuery,
	sqlSearchBody,
	type RouteDef,
} from "./framework.ts";

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
			method: "post",
			path: "/api/invoices/search-sql",
			operationId: "invoice_search_sql",
			summary: "Query invoices with SuiteQL",
			description:
				"Query invoices using SuiteQL. Available columns: id, tranId, tranDate, entity, status, total, foreignAmountUnpaid, dueDate, memo. Status A=Open, B=Paid In Full.",
			body: sqlSearchBody,
			handler: async ({ body }) => api.searchBySQL(body.where, body.limit),
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
			description:
				"Create a new invoice. Key fields: entity (customer, required), subsidiary, tranDate, dueDate, memo, currency, department, location, salesRep, terms, account, createdFrom (source SO/PI), item ({items: [{item, quantity, rate}]}).",
			successStatus: 201,
			handler: async ({ body }) =>
				api.create(body as Record<string, unknown>),
		}),
		defineRoute({
			method: "patch",
			path: "/api/invoices/:id",
			operationId: "invoice_update",
			summary: "Update an invoice",
			description:
				"Update an existing invoice by internal ID (PATCH). Updatable: memo, dueDate, exchangeRate, department, location, salesRep, terms, etc.",
			handler: async ({ params, body }) =>
				api.update(params.id, body as Record<string, unknown>),
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
