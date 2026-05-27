import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { InventoryAPI } from "../api/inventory.ts";
import { err, ok } from "./helpers.ts";

export function registerInventoryTools(server: McpServer, api: InventoryAPI) {
	server.tool(
		"inventory_list",
		"List inventory items from NetSuite via Record API GET. Returns paginated inventory item records. Use q for NetSuite filter expressions, and limit/offset for pagination.",
		{
			q: z
				.string()
				.optional()
				.describe(
					'Optional NetSuite Record API filter expression, e.g. itemId CONTAIN "BEER"',
				),
			limit: z.number().optional().describe("Max records to return"),
			offset: z.number().optional().describe("Pagination offset"),
		},
		async ({ q, limit, offset }) => {
			try {
				return ok(await api.list({ q, limit, offset }));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"inventory_get",
		"Get a single inventory item by internal ID. Returns all fields including itemId (SKU), displayName, description, cost, pricing, stock levels, and warehouse locations.",
		{ id: z.string().describe("Inventory item internal ID") },
		async ({ id }) => {
			try {
				return ok(await api.get(id));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"inventory_search",
		"Search inventory items by item ID (SKU) keyword. Uses NetSuite's CONTAIN operator for partial matching.",
		{
			keyword: z.string().describe("Item ID/SKU keyword to search"),
			limit: z.number().optional().describe("Max records to return"),
		},
		async ({ keyword, limit }) => {
			try {
				return ok(await api.search(keyword, { limit }));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"inventory_query_stock",
		"Query real-time stock levels for specific items via SuiteQL. Returns quantityOnHand, quantityAvailable, and quantityOnOrder per item from the inventoryBalance table.",
		{
			itemIds: z
				.array(z.string())
				.describe("Array of item internal IDs to query stock for"),
		},
		async ({ itemIds }) => {
			try {
				return ok(await api.queryStock(itemIds));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"inventory_search_lot_numbers",
		"Search available lot/serial numbers for a lot-tracked item. Returns inventoryNumber records with id, inventoryNumber (text), expirationDate (may be empty), location, quantityOnHand, and quantityAvailable. Filtered to lots with on-hand > 0 and ordered by lot id ascending (oldest-first ≈ FIFO). For outbound transactions (Sales Order / PI / Invoice), use the returned id as issueInventoryNumber.id. For inbound transactions (Vendor Bill / PO Receive / Item Receipt) against an EXISTING lot, use receiptInventoryNumber: {id}; for a BRAND-NEW lot, use receiptInventoryNumber: {refName: 'LOT-NAME'} instead (no lookup needed — NetSuite auto-creates the lot record).",
		{
			itemId: z.string().describe("Inventory item internal ID"),
			locationId: z
				.string()
				.optional()
				.describe("Optional warehouse/location internal ID to filter by"),
		},
		async ({ itemId, locationId }) => {
			try {
				return ok(await api.searchLotNumbers(itemId, locationId));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"inventory_lot_create",
		`Pre-create an inventoryNumber (lot/serial) master record so it can be referenced by id on inbound transactions.

Use this when the in-line {refName: "..."} auto-create on a transaction returns INVALID_VALUE / USER_ERROR — some NetSuite account configurations reject implicit lot creation on standalone Vendor Bills (and a few other inbound docs). After this call, pass the returned id as receiptInventoryNumber.id on the line's inventoryDetail.

Fields:
- inventoryNumber (string): Lot/serial number string (e.g. "SBLF2649"). Required.
- item (object): {id: "..."} — the lot-tracked inventory item. Required.
- expirationDate (string): Lot expiration, YYYY-MM-DD. Required if the item has shelf-life tracking enabled.
- memo (string): Optional notes on the lot.

Example:
{
  "inventoryNumber": "SBLF2649",
  "item": {"id": "1914"},
  "expirationDate": "2028-05-01"
}`,
		{
			data: z
				.record(z.string(), z.unknown())
				.describe(
					"inventoryNumber fields — see tool description for required fields and example",
				),
		},
		async ({ data }) => {
			try {
				return ok(await api.createLot(data));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"inventory_create",
		`Create a new inventory item in NetSuite.

Key fields:
- itemId (string): Item name/number (SKU). Required. Max 250 chars.
- displayName (string): Display name shown in UI.
- subsidiary (object): {"items":[{"id":"1"}]} — subsidiary collection (OneWorld). Required. Item can be shared across multiple subsidiaries.
- description (string): General description.
- purchaseDescription (string): Description on purchase orders (max 999 chars).
- salesDescription (string): Description on sales transactions.
- cost (number): Purchase price.
- unitsType (object): {id: "1"} — unit of measure type.
- incomeAccount (object): {id: "..."} — income GL account. Required.
- cogsAccount (object): {id: "..."} — COGS GL account. Required.
- assetAccount (object): {id: "..."} — asset GL account. Required.
- taxSchedule (object): {id: "..."} — tax schedule.
- weight (number): Item weight.
- upcCode (string): UPC/barcode.
- isInactive (boolean): Defaults to false.
- isOnline (boolean): Display in web store.
- trackLandedCost (boolean): Track landed costs.

Example:
{
  "itemId": "BEER-CARLSBERG-330ML",
  "displayName": "Carlsberg Beer 330ml",
  "subsidiary": {"items": [{"id": "1"}]},
  "purchaseDescription": "Carlsberg Beer 330ml x 24 cans",
  "salesDescription": "Carlsberg Beer 330ml",
  "cost": 12.50,
  "incomeAccount": {"id": "100"},
  "cogsAccount": {"id": "101"},
  "assetAccount": {"id": "102"},
  "taxSchedule": {"id": "1"}
}`,
		{
			data: z
				.record(z.string(), z.unknown())
				.describe(
					"Inventory item fields — see tool description for available fields and examples",
				),
		},
		async ({ data }) => {
			try {
				return ok(await api.create(data));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"inventory_update",
		`Update an existing inventory item by internal ID. Only provided fields are updated (PATCH).

Updatable fields include: itemId, displayName, description, purchaseDescription, salesDescription,
cost, weight, upcCode, isInactive, isOnline, and all reference fields (use {id: "..."} format).

Example: {"displayName": "New Name", "cost": 15.00, "isInactive": false}`,
		{
			id: z.string().describe("Inventory item internal ID"),
			data: z
				.record(z.string(), z.unknown())
				.describe("Fields to update — see tool description"),
		},
		async ({ id, data }) => {
			try {
				return ok(await api.update(id, data));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"inventory_adjust",
		`Create an inventory adjustment to correct stock quantities (e.g. after physical count).

Key fields:
- subsidiary (object): {id: "1"} — Required.
- account (object): {id: "..."} — adjustment GL account. Required.
- adjLocation (object): {id: "..."} — location for adjustment.
- tranDate (string): Date in YYYY-MM-DD format.
- memo (string): Reason for adjustment.
- inventory (object): Line items with item, adjustQtyBy, location.

Example:
{
  "subsidiary": {"id": "1"},
  "account": {"id": "100"},
  "adjLocation": {"id": "1"},
  "tranDate": "2026-05-08",
  "memo": "Physical count adjustment",
  "inventory": {"items": [
    {"item": {"id": "225"}, "adjustQtyBy": 10, "location": {"id": "1"}}
  ]}
}`,
		{
			data: z
				.record(z.string(), z.unknown())
				.describe(
					"Inventory adjustment data — see tool description for fields and example",
				),
		},
		async ({ data }) => {
			try {
				return ok(await api.adjustInventory(data));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"inventory_transfer",
		`Create an inventory transfer to move stock between locations.

Key fields:
- subsidiary (object): {id: "1"} — Required.
- location (object): {id: "..."} — source location. Required.
- transferLocation (object): {id: "..."} — destination location. Required.
- tranDate (string): Date in YYYY-MM-DD format.
- memo (string): Transfer notes.
- inventory (object): Line items with item and adjustQtyBy.

Example:
{
  "subsidiary": {"id": "1"},
  "location": {"id": "1"},
  "transferLocation": {"id": "2"},
  "tranDate": "2026-05-08",
  "memo": "Transfer to warehouse B",
  "inventory": {"items": [
    {"item": {"id": "225"}, "adjustQtyBy": 50}
  ]}
}`,
		{
			data: z
				.record(z.string(), z.unknown())
				.describe(
					"Inventory transfer data — see tool description for fields and example",
				),
		},
		async ({ data }) => {
			try {
				return ok(await api.transferInventory(data));
			} catch (e) {
				return err(e);
			}
		},
	);
}
