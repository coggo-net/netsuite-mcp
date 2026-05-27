import type { VendorAPI } from "../api/vendors.ts";
import {
	defineRoute,
	paginationQuery,
	type RouteDef,
	searchQuery,
} from "./framework.ts";
import { vendorBody, vendorBodyPartial } from "./schemas.ts";

export function vendorRoutes(api: VendorAPI): RouteDef[] {
	return [
		defineRoute({
			method: "get",
			path: "/api/vendors",
			operationId: "vendor_list",
			summary: "List vendors",
			description:
				"List vendors (suppliers) from NetSuite. Returns paginated vendor records with basic info (id, links). Use limit/offset for pagination.",
			query: paginationQuery,
			handler: async ({ query }) => api.list(query),
		}),
		defineRoute({
			method: "get",
			path: "/api/vendors/search",
			operationId: "vendor_search",
			summary: "Search vendors by company name",
			description:
				"Search vendors by company name keyword. Uses NetSuite's CONTAIN operator on companyName for partial matches. For person-type vendors (isPerson=true), companyName is typically empty — search may miss those; fall back to the list endpoint with pagination if needed.",
			query: searchQuery,
			handler: async ({ query }) =>
				api.search(query.keyword, { limit: query.limit }),
		}),
		defineRoute({
			method: "get",
			path: "/api/vendors/:id",
			operationId: "vendor_get",
			summary: "Get a vendor by ID",
			description:
				"Get a single vendor record by internal ID. Returns all fields including companyName, legalName, contact info, balance, currency, terms, subsidiary, payablesAccount, expenseAccount, addressBook, and custom fields.",
			handler: async ({ params }) => api.get(params.id),
		}),
		defineRoute({
			method: "post",
			path: "/api/vendors",
			operationId: "vendor_create",
			summary: "Create a vendor",
			description: "Create a new vendor (supplier) record in NetSuite.",
			body: vendorBody,
			successStatus: 201,
			handler: async ({ body }) => api.create(body),
		}),
		defineRoute({
			method: "patch",
			path: "/api/vendors/:id",
			operationId: "vendor_update",
			summary: "Update a vendor",
			description:
				"Update an existing vendor record by internal ID (PATCH). Only provided fields are updated.",
			body: vendorBodyPartial,
			handler: async ({ params, body }) => api.update(params.id, body),
		}),
		defineRoute({
			method: "delete",
			path: "/api/vendors/:id",
			operationId: "vendor_delete",
			summary: "Delete a vendor",
			description:
				"Delete a vendor record by internal ID. This action is irreversible. Prefer isInactive: true unless the vendor has no transactions.",
			handler: async ({ params }) => api.delete(params.id),
		}),
	];
}
