import { z } from "zod";
import type { InventoryAPI } from "../api/inventory.ts";
import {
	defineRoute,
	paginationQuery,
	searchQuery,
	type RouteDef,
} from "./framework.ts";
import {
	inventoryItemBody,
	inventoryItemBodyPartial,
	inventoryAdjustmentBody,
	inventoryTransferBody,
} from "./schemas.ts";

export function inventoryRoutes(api: InventoryAPI): RouteDef[] {
	return [
		defineRoute({
			method: "get",
			path: "/api/inventory",
			operationId: "inventory_list",
			summary: "List inventory items",
			description:
				"List inventory items from NetSuite. Returns paginated inventory item records.",
			query: paginationQuery,
			handler: async ({ query }) => api.list(query),
		}),
		defineRoute({
			method: "get",
			path: "/api/inventory/search",
			operationId: "inventory_search",
			summary: "Search inventory items by SKU",
			description:
				"Search inventory items by item ID (SKU) keyword. Uses NetSuite's CONTAIN operator for partial matching.",
			query: searchQuery,
			handler: async ({ query }) =>
				api.search(query.keyword, { limit: query.limit }),
		}),
		defineRoute({
			method: "post",
			path: "/api/inventory/stock",
			operationId: "inventory_query_stock",
			summary: "Query stock levels",
			description:
				"Query real-time stock levels for specific items via SuiteQL. Returns quantityOnHand, quantityAvailable, and quantityOnOrder per item from the inventoryBalance table.",
			body: z.object({
				itemIds: z
					.array(z.string())
					.describe("Array of item internal IDs to query stock for"),
			}),
			handler: async ({ body }) => api.queryStock(body.itemIds),
		}),
		defineRoute({
			method: "get",
			path: "/api/inventory/:id",
			operationId: "inventory_get",
			summary: "Get an inventory item by ID",
			description:
				"Get a single inventory item by internal ID. Returns all fields including itemId (SKU), displayName, description, cost, pricing, stock levels, and warehouse locations.",
			handler: async ({ params }) => api.get(params.id),
		}),
		defineRoute({
			method: "post",
			path: "/api/inventory",
			operationId: "inventory_create",
			summary: "Create an inventory item",
			description: "Create a new inventory item in NetSuite.",
			body: inventoryItemBody,
			successStatus: 201,
			handler: async ({ body }) => api.create(body),
		}),
		defineRoute({
			method: "patch",
			path: "/api/inventory/:id",
			operationId: "inventory_update",
			summary: "Update an inventory item",
			description:
				"Update an existing inventory item by internal ID (PATCH). Only provided fields are updated.",
			body: inventoryItemBodyPartial,
			handler: async ({ params, body }) => api.update(params.id, body),
		}),
		defineRoute({
			method: "post",
			path: "/api/inventory/adjust",
			operationId: "inventory_adjust",
			summary: "Create inventory adjustment",
			description:
				"Create an inventory adjustment to correct stock quantities (e.g. after physical count).",
			body: inventoryAdjustmentBody,
			successStatus: 201,
			handler: async ({ body }) => api.adjustInventory(body),
		}),
		defineRoute({
			method: "post",
			path: "/api/inventory/transfer",
			operationId: "inventory_transfer",
			summary: "Create inventory transfer",
			description:
				"Create an inventory transfer to move stock between locations.",
			body: inventoryTransferBody,
			successStatus: 201,
			handler: async ({ body }) => api.transferInventory(body),
		}),
	];
}
