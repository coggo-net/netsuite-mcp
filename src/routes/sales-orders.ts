import { z } from "zod";
import type { ProformaInvoiceAPI } from "../api/proforma-invoices.ts";
import type { SalesOrderAPI } from "../api/sales-orders.ts";
import {
	defineRoute,
	paginationQuery,
	searchQuery,
	sqlSearchBody,
	type RouteDef,
} from "./framework.ts";

export function salesOrderRoutes(
	api: SalesOrderAPI,
	piApi: ProformaInvoiceAPI,
): RouteDef[] {
	return [
		defineRoute({
			method: "get",
			path: "/api/sales-orders",
			operationId: "sales_order_list",
			summary: "List sales orders",
			description:
				"List sales orders from NetSuite. Sales orders include Pro-Forma Invoices (PI). Returns paginated records.",
			query: paginationQuery,
			handler: async ({ query }) => api.list(query),
		}),
		defineRoute({
			method: "get",
			path: "/api/sales-orders/search",
			operationId: "sales_order_search",
			summary: "Search sales orders by transaction ID",
			description:
				"Search sales orders by transaction ID keyword (e.g. 'PI001' to find Pro-Forma Invoices).",
			query: searchQuery,
			handler: async ({ query }) =>
				api.search(query.keyword, { limit: query.limit }),
		}),
		defineRoute({
			method: "post",
			path: "/api/sales-orders/search-sql",
			operationId: "sales_order_search_sql",
			summary: "Query sales orders with SuiteQL",
			description:
				"Query sales orders using SuiteQL. Available columns: id, tranId, tranDate, entity, status, total, memo. Status codes: B=Pending Fulfillment, G=Billed, H=Closed.",
			body: sqlSearchBody,
			handler: async ({ body }) => api.searchBySQL(body.where, body.limit),
		}),
		defineRoute({
			method: "get",
			path: "/api/sales-orders/:id",
			operationId: "sales_order_get",
			summary: "Get a sales order by ID",
			description:
				"Get a single sales order / Pro-Forma Invoice by internal ID. Returns all fields including line items, entity, status, amounts, shipping info, and custom fields.",
			handler: async ({ params }) => api.get(params.id),
		}),
		defineRoute({
			method: "post",
			path: "/api/sales-orders",
			operationId: "sales_order_create",
			summary: "Create a sales order",
			description:
				"Create a new sales order or Pro-Forma Invoice. Key fields: entity (customer, required), subsidiary, tranDate, memo, currency, location, department, salesRep, customForm (PI form), terms, item ({items: [{item, quantity, rate}]}).",
			successStatus: 201,
			handler: async ({ body }) =>
				api.create(body as Record<string, unknown>),
		}),
		defineRoute({
			method: "patch",
			path: "/api/sales-orders/:id",
			operationId: "sales_order_update",
			summary: "Update a sales order",
			description:
				"Update an existing sales order / Pro-Forma Invoice (PATCH). Updatable: memo, shipDate, exchangeRate, location, department, salesRep, terms. To update line items, provide the full item array.",
			handler: async ({ params, body }) =>
				api.update(params.id, body as Record<string, unknown>),
		}),
		defineRoute({
			method: "delete",
			path: "/api/sales-orders/:id",
			operationId: "sales_order_delete",
			summary: "Delete a sales order",
			description:
				"Delete a sales order / Pro-Forma Invoice by internal ID. This action is irreversible.",
			handler: async ({ params }) => api.delete(params.id),
		}),
		// Pro-Forma Invoices
		defineRoute({
			method: "get",
			path: "/api/proforma-invoices/recent",
			operationId: "pi_list_recent",
			summary: "List recent Pro-Forma Invoices",
			description:
				"List recent Pro-Forma Invoices ordered by date descending. Returns tranId, tranDate, entity, status, total, and memo via SuiteQL.",
			query: z.object({
				limit: z.number().optional().describe("Max records to return (default 20)"),
			}),
			handler: async ({ query }) => piApi.listRecent(query.limit),
		}),
		defineRoute({
			method: "post",
			path: "/api/proforma-invoices/search-sql",
			operationId: "pi_search_sql",
			summary: "Query Pro-Forma Invoices with SuiteQL",
			description:
				"Query Pro-Forma Invoices using SuiteQL. Available columns: id, tranId, tranDate, entity, status, total, memo, dueDate. Status codes: B=Pending Fulfillment, G=Billed, H=Closed.",
			body: sqlSearchBody,
			handler: async ({ body }) => piApi.searchBySQL(body.where, body.limit),
		}),
	];
}
