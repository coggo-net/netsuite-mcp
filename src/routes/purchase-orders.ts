import type { PurchaseOrderAPI } from "../api/purchase-orders.ts";
import {
	defineRoute,
	paginationQuery,
	type RouteDef,
	searchQuery,
} from "./framework.ts";
import {
	itemReceiptBody,
	purchaseOrderBody,
	purchaseOrderBodyPartial,
} from "./schemas.ts";

export function purchaseOrderRoutes(api: PurchaseOrderAPI): RouteDef[] {
	return [
		defineRoute({
			method: "get",
			path: "/api/purchase-orders",
			operationId: "purchase_order_list",
			summary: "List purchase orders",
			description:
				"List purchase orders from NetSuite. Returns paginated purchase order records.",
			query: paginationQuery,
			handler: async ({ query }) => api.list(query),
		}),
		defineRoute({
			method: "get",
			path: "/api/purchase-orders/search",
			operationId: "purchase_order_search",
			summary: "Search purchase orders by transaction ID",
			description:
				"Search purchase orders by transaction ID keyword (e.g. 'PO000' to find matching POs).",
			query: searchQuery,
			handler: async ({ query }) =>
				api.search(query.keyword, { limit: query.limit }),
		}),
		defineRoute({
			method: "post",
			path: "/api/purchase-orders/receive",
			operationId: "purchase_order_receive",
			summary: "Transform a purchase order into an item receipt",
			description:
				"Create an item receipt by transforming a purchase order through NetSuite's purchaseOrder -> itemReceipt transform endpoint. Provide createdFrom.id as the source purchase order internal ID; the API uses it as the transform path id and sends the remaining receipt fields as optional overrides. Returns the created item receipt id when NetSuite includes a Location header.",
			body: itemReceiptBody,
			successStatus: 201,
			handler: async ({ body }) => api.receive(body),
		}),
		defineRoute({
			method: "get",
			path: "/api/purchase-orders/:id",
			operationId: "purchase_order_get",
			summary: "Get a purchase order by ID",
			description:
				"Get a single purchase order by internal ID. Returns all fields including vendor, line items, amounts, shipping details, approval status, and custom fields.",
			handler: async ({ params }) => api.get(params.id),
		}),
		defineRoute({
			method: "post",
			path: "/api/purchase-orders",
			operationId: "purchase_order_create",
			summary: "Create a purchase order",
			description: "Create a new purchase order in NetSuite.",
			body: purchaseOrderBody,
			successStatus: 201,
			handler: async ({ body }) => api.create(body),
		}),
		defineRoute({
			method: "patch",
			path: "/api/purchase-orders/:id",
			operationId: "purchase_order_update",
			summary: "Update a purchase order",
			description:
				"Update an existing purchase order (PATCH). Only provided header fields are updated. If the item sublist is included, it FULLY REPLACES the existing line items — provide the complete set of lines you want to keep. Omit item to leave existing lines untouched.",
			body: purchaseOrderBodyPartial,
			handler: async ({ params, body }) => api.update(params.id, body),
		}),
		defineRoute({
			method: "delete",
			path: "/api/purchase-orders/:id",
			operationId: "purchase_order_delete",
			summary: "Delete a purchase order",
			description:
				"Delete a purchase order by internal ID. This action is irreversible.",
			handler: async ({ params }) => api.delete(params.id),
		}),
	];
}
