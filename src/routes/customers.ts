import type { CustomerAPI } from "../api/customers.ts";
import {
	defineRoute,
	paginationQuery,
	type RouteDef,
	searchQuery,
	sqlSearchBody,
} from "./framework.ts";
import { customerBody, customerBodyPartial } from "./schemas.ts";

export function customerRoutes(api: CustomerAPI): RouteDef[] {
	return [
		defineRoute({
			method: "get",
			path: "/api/customers",
			operationId: "customer_list",
			summary: "List customers",
			description:
				"List customers from NetSuite. Returns paginated customer records with basic info (id, links). Use limit/offset for pagination.",
			query: paginationQuery,
			handler: async ({ query }) => api.list(query),
		}),
		defineRoute({
			method: "get",
			path: "/api/customers/search",
			operationId: "customer_search",
			summary: "Search customers by company name",
			description:
				"Search customers by company name keyword. Uses NetSuite's CONTAIN operator to match partial company names.",
			query: searchQuery,
			handler: async ({ query }) =>
				api.search(query.keyword, { limit: query.limit }),
		}),
		defineRoute({
			method: "post",
			path: "/api/customers/search-sql",
			operationId: "customer_search_sql",
			summary: "Query customers with SuiteQL",
			description:
				"Query customers using SuiteQL. Available columns: id, entityId, companyName, email, phone, isInactive. Provide a WHERE clause.",
			body: sqlSearchBody,
			handler: async ({ body }) => api.searchBySQL(body.where, body.limit),
		}),
		defineRoute({
			method: "get",
			path: "/api/customers/:id",
			operationId: "customer_get",
			summary: "Get a customer by ID",
			description:
				"Get a single customer record by internal ID. Returns all fields including company name, contact info, balance, addresses, currency settings, and custom fields.",
			handler: async ({ params }) => api.get(params.id),
		}),
		defineRoute({
			method: "post",
			path: "/api/customers",
			operationId: "customer_create",
			summary: "Create a customer",
			description: "Create a new customer record in NetSuite.",
			body: customerBody,
			successStatus: 201,
			handler: async ({ body }) => api.create(body),
		}),
		defineRoute({
			method: "patch",
			path: "/api/customers/:id",
			operationId: "customer_update",
			summary: "Update a customer",
			description:
				"Update an existing customer record by internal ID (PATCH). Only provided fields are updated.",
			body: customerBodyPartial,
			handler: async ({ params, body }) => api.update(params.id, body),
		}),
		defineRoute({
			method: "delete",
			path: "/api/customers/:id",
			operationId: "customer_delete",
			summary: "Delete a customer",
			description:
				"Delete a customer record by internal ID. This action is irreversible.",
			handler: async ({ params }) => api.delete(params.id),
		}),
	];
}
