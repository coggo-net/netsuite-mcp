import type { LocationAPI } from "../api/locations.ts";
import {
	defineRoute,
	paginationQuery,
	type RouteDef,
	searchQuery,
} from "./framework.ts";
import { locationBody, locationBodyPartial } from "./schemas.ts";

export function locationRoutes(api: LocationAPI): RouteDef[] {
	return [
		defineRoute({
			method: "get",
			path: "/api/locations",
			operationId: "location_list",
			summary: "List locations",
			description:
				"List locations (warehouses, stores, branches) from NetSuite. Returns paginated location records (id, links). Use limit/offset for pagination.",
			query: paginationQuery,
			handler: async ({ query }) => api.list(query),
		}),
		defineRoute({
			method: "get",
			path: "/api/locations/search",
			operationId: "location_search",
			summary: "Search locations by name",
			description:
				"Search locations by name keyword. Uses NetSuite's CONTAIN operator on the `name` field for partial matches.",
			query: searchQuery,
			handler: async ({ query }) =>
				api.search(query.keyword, { limit: query.limit }),
		}),
		defineRoute({
			method: "get",
			path: "/api/locations/:id",
			operationId: "location_get",
			summary: "Get a location by ID",
			description:
				"Get a single location by internal ID. Returns name, fullName, mainAddress, subsidiary, parent location, locationType, makeInventoryAvailable flag, and other configuration.",
			handler: async ({ params }) => api.get(params.id),
		}),
		defineRoute({
			method: "post",
			path: "/api/locations",
			operationId: "location_create",
			summary: "Create a location",
			description: "Create a new location record in NetSuite.",
			body: locationBody,
			successStatus: 201,
			handler: async ({ body }) => api.create(body),
		}),
		defineRoute({
			method: "patch",
			path: "/api/locations/:id",
			operationId: "location_update",
			summary: "Update a location",
			description:
				"Update an existing location by internal ID (PATCH). Only provided fields are updated.",
			body: locationBodyPartial,
			handler: async ({ params, body }) => api.update(params.id, body),
		}),
		defineRoute({
			method: "delete",
			path: "/api/locations/:id",
			operationId: "location_delete",
			summary: "Delete a location",
			description:
				"Delete a location by internal ID. Will fail if the location is referenced by any transaction or inventory record. Prefer isInactive: true.",
			handler: async ({ params }) => api.delete(params.id),
		}),
	];
}
