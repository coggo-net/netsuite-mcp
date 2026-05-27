import type { SubsidiaryAPI } from "../api/subsidiaries.ts";
import {
	defineRoute,
	paginationQuery,
	type RouteDef,
	searchQuery,
} from "./framework.ts";
import { subsidiaryBody, subsidiaryBodyPartial } from "./schemas.ts";

export function subsidiaryRoutes(api: SubsidiaryAPI): RouteDef[] {
	return [
		defineRoute({
			method: "get",
			path: "/api/subsidiaries",
			operationId: "subsidiary_list",
			summary: "List subsidiaries",
			description:
				"List subsidiaries from NetSuite. OneWorld accounts only. Returns paginated subsidiary records (id, links). The list is usually small.",
			query: paginationQuery,
			handler: async ({ query }) => api.list(query),
		}),
		defineRoute({
			method: "get",
			path: "/api/subsidiaries/search",
			operationId: "subsidiary_search",
			summary: "Search subsidiaries by name",
			description:
				"Search subsidiaries by name keyword. Uses NetSuite's CONTAIN operator on the `name` field.",
			query: searchQuery,
			handler: async ({ query }) =>
				api.search(query.keyword, { limit: query.limit }),
		}),
		defineRoute({
			method: "get",
			path: "/api/subsidiaries/:id",
			operationId: "subsidiary_get",
			summary: "Get a subsidiary by ID",
			description:
				"Get a single subsidiary by internal ID. Returns name, legalName, country, state, currency, parent subsidiary, tax IDs, addresses, and flags.",
			handler: async ({ params }) => api.get(params.id),
		}),
		defineRoute({
			method: "post",
			path: "/api/subsidiaries",
			operationId: "subsidiary_create",
			summary: "Create a subsidiary",
			description:
				"Create a new subsidiary in NetSuite. OneWorld accounts only; typically requires administrator role.",
			body: subsidiaryBody,
			successStatus: 201,
			handler: async ({ body }) => api.create(body),
		}),
		defineRoute({
			method: "patch",
			path: "/api/subsidiaries/:id",
			operationId: "subsidiary_update",
			summary: "Update a subsidiary",
			description:
				"Update an existing subsidiary by internal ID (PATCH). Only provided fields are updated.",
			body: subsidiaryBodyPartial,
			handler: async ({ params, body }) => api.update(params.id, body),
		}),
		defineRoute({
			method: "delete",
			path: "/api/subsidiaries/:id",
			operationId: "subsidiary_delete",
			summary: "Delete a subsidiary",
			description:
				"Delete a subsidiary by internal ID. Will fail if any records reference the subsidiary. Strongly prefer isInactive: true.",
			handler: async ({ params }) => api.delete(params.id),
		}),
	];
}
