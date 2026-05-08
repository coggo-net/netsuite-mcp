import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createAPI } from "./api/index.ts";
import { createNetSuiteClient } from "./netsuite-client.ts";

function ok(data: unknown) {
	return {
		content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
	};
}

function err(error: unknown) {
	const message = error instanceof Error ? error.message : String(error);
	return {
		content: [{ type: "text" as const, text: `Error: ${message}` }],
		isError: true,
	};
}

export function createServer() {
	const server = new McpServer({
		name: "netsuite-mcp",
		version: "0.1.0",
	});

	const client = createNetSuiteClient();
	const api = createAPI(client);

	// ─── Customers ───────────────────────────────────────────────

	server.tool(
		"customer_list",
		"List customers from NetSuite. Returns paginated customer records with basic info (id, links). Use limit/offset for pagination.",
		{
			limit: z
				.number()
				.optional()
				.describe("Max records to return (default 100)"),
			offset: z.number().optional().describe("Pagination offset"),
		},
		async ({ limit, offset }) => {
			try {
				return ok(await api.customers.list({ limit, offset }));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"customer_get",
		"Get a single customer record by internal ID. Returns all fields including company name, contact info, balance, addresses, currency settings, and custom fields.",
		{ id: z.string().describe("Customer internal ID") },
		async ({ id }) => {
			try {
				return ok(await api.customers.get(id));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"customer_search",
		"Search customers by company name keyword. Uses NetSuite's CONTAIN operator to match partial company names.",
		{
			keyword: z.string().describe("Company name keyword to search"),
			limit: z.number().optional().describe("Max records to return"),
		},
		async ({ keyword, limit }) => {
			try {
				return ok(await api.customers.search(keyword, { limit }));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"customer_search_sql",
		"Query customers using SuiteQL. Available columns: id, entityId, companyName, email, phone, isInactive. Provide a WHERE clause.",
		{
			where: z
				.string()
				.describe("SuiteQL WHERE clause, e.g. \"companyName LIKE '%WINE%'\""),
			limit: z.number().optional().describe("Max records (default 100)"),
		},
		async ({ where, limit }) => {
			try {
				return ok(await api.customers.searchBySQL(where, limit));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"customer_create",
		"Create a new customer record in NetSuite. Required fields typically include companyName or firstName/lastName, subsidiary. Returns the created record.",
		{
			data: z
				.record(z.unknown())
				.describe(
					"Customer fields (e.g. companyName, email, phone, subsidiary, currency, etc.)",
				),
		},
		async ({ data }) => {
			try {
				return ok(await api.customers.create(data));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"customer_update",
		"Update an existing customer record by internal ID. Only the provided fields will be updated (PATCH semantics).",
		{
			id: z.string().describe("Customer internal ID"),
			data: z.record(z.unknown()).describe("Fields to update"),
		},
		async ({ id, data }) => {
			try {
				return ok(await api.customers.update(id, data));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"customer_delete",
		"Delete a customer record by internal ID. This action is irreversible.",
		{ id: z.string().describe("Customer internal ID") },
		async ({ id }) => {
			try {
				return ok(await api.customers.delete(id));
			} catch (e) {
				return err(e);
			}
		},
	);

	// ─── Inventory ────────────────────────────────────────────────

	server.tool(
		"inventory_list",
		"List inventory items from NetSuite. Returns paginated inventory item records. Each item includes id and links to the full record.",
		{
			limit: z.number().optional().describe("Max records to return"),
			offset: z.number().optional().describe("Pagination offset"),
		},
		async ({ limit, offset }) => {
			try {
				return ok(await api.inventory.list({ limit, offset }));
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
				return ok(await api.inventory.get(id));
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
				return ok(await api.inventory.search(keyword, { limit }));
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
				return ok(await api.inventory.queryStock(itemIds));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"inventory_create",
		"Create a new inventory item in NetSuite. Required fields typically include itemId (SKU), displayName, and subsidiary.",
		{
			data: z
				.record(z.unknown())
				.describe(
					"Inventory item fields (e.g. itemId, displayName, purchaseDescription, cost, etc.)",
				),
		},
		async ({ data }) => {
			try {
				return ok(await api.inventory.create(data));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"inventory_update",
		"Update an existing inventory item by internal ID. Only the provided fields will be updated.",
		{
			id: z.string().describe("Inventory item internal ID"),
			data: z.record(z.unknown()).describe("Fields to update"),
		},
		async ({ id, data }) => {
			try {
				return ok(await api.inventory.update(id, data));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"inventory_adjust",
		"Create an inventory adjustment transaction. Used to correct stock quantities (e.g. after a physical count). Requires account, subsidiary, and inventory line items.",
		{
			data: z
				.record(z.unknown())
				.describe(
					"Inventory adjustment data including account, subsidiary, adjLocation, and inventory line items",
				),
		},
		async ({ data }) => {
			try {
				return ok(await api.inventory.adjustInventory(data));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"inventory_transfer",
		"Create an inventory transfer between locations. Moves stock from one warehouse/location to another.",
		{
			data: z
				.record(z.unknown())
				.describe(
					"Transfer data including subsidiary, location (from), transferLocation (to), and inventory line items",
				),
		},
		async ({ data }) => {
			try {
				return ok(await api.inventory.transferInventory(data));
			} catch (e) {
				return err(e);
			}
		},
	);

	// ─── Sales Orders (shared with Pro-Forma Invoices) ────────────

	server.tool(
		"sales_order_list",
		"List sales orders from NetSuite. In this account, sales orders include Pro-Forma Invoices (PI). Returns paginated records.",
		{
			limit: z.number().optional().describe("Max records to return"),
			offset: z.number().optional().describe("Pagination offset"),
		},
		async ({ limit, offset }) => {
			try {
				return ok(await api.salesOrders.list({ limit, offset }));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"sales_order_get",
		"Get a single sales order / Pro-Forma Invoice by internal ID. Returns all fields including line items, entity, status, amounts, shipping info, and custom fields.",
		{ id: z.string().describe("Sales order internal ID") },
		async ({ id }) => {
			try {
				return ok(await api.salesOrders.get(id));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"sales_order_search",
		"Search sales orders by transaction ID keyword (e.g. 'PI001' to find Pro-Forma Invoices).",
		{
			keyword: z.string().describe("Transaction ID keyword to search"),
			limit: z.number().optional().describe("Max records to return"),
		},
		async ({ keyword, limit }) => {
			try {
				return ok(await api.salesOrders.search(keyword, { limit }));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"sales_order_search_sql",
		"Query sales orders using SuiteQL. Available columns: id, tranId, tranDate, entity, status, total, memo. Status codes: B=Pending Fulfillment, G=Billed, H=Closed.",
		{
			where: z
				.string()
				.describe(
					"SuiteQL WHERE clause, e.g. \"tranId LIKE 'PI%' AND status = 'B'\"",
				),
			limit: z.number().optional().describe("Max records (default 100)"),
		},
		async ({ where, limit }) => {
			try {
				return ok(await api.salesOrders.searchBySQL(where, limit));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"sales_order_create",
		"Create a new sales order / Pro-Forma Invoice. Required fields: entity (customer ID), item (line items with item and quantity). Set customForm for PI-specific form.",
		{
			data: z
				.record(z.unknown())
				.describe(
					"Sales order fields including entity, item (line items), tranDate, memo, currency, etc.",
				),
		},
		async ({ data }) => {
			try {
				return ok(await api.salesOrders.create(data));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"sales_order_update",
		"Update an existing sales order / Pro-Forma Invoice by internal ID. Only the provided fields will be updated.",
		{
			id: z.string().describe("Sales order internal ID"),
			data: z.record(z.unknown()).describe("Fields to update"),
		},
		async ({ id, data }) => {
			try {
				return ok(await api.salesOrders.update(id, data));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"sales_order_delete",
		"Delete a sales order / Pro-Forma Invoice by internal ID. This action is irreversible.",
		{ id: z.string().describe("Sales order internal ID") },
		async ({ id }) => {
			try {
				return ok(await api.salesOrders.delete(id));
			} catch (e) {
				return err(e);
			}
		},
	);

	// ─── Pro-Forma Invoices (convenience layer over sales orders) ──

	server.tool(
		"pi_list_recent",
		"List recent Pro-Forma Invoices ordered by date descending. Returns tranId (e.g. PI001809), tranDate, entity, status, total, and memo via SuiteQL.",
		{
			limit: z
				.number()
				.optional()
				.describe("Max records to return (default 20)"),
		},
		async ({ limit }) => {
			try {
				return ok(await api.proformaInvoices.listRecent(limit));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"pi_search_sql",
		"Query Pro-Forma Invoices using SuiteQL. Available columns: id, tranId, tranDate, entity, status, total, memo, dueDate. Status codes: B=Pending Fulfillment, G=Billed, H=Closed.",
		{
			where: z
				.string()
				.describe(
					"SuiteQL WHERE clause, e.g. \"status = 'B' AND total > 10000\"",
				),
			limit: z.number().optional().describe("Max records (default 100)"),
		},
		async ({ where, limit }) => {
			try {
				return ok(await api.proformaInvoices.searchBySQL(where, limit));
			} catch (e) {
				return err(e);
			}
		},
	);

	// ─── Invoices ─────────────────────────────────────────────────

	server.tool(
		"invoice_list",
		"List invoices from NetSuite. Returns paginated invoice records.",
		{
			limit: z.number().optional().describe("Max records to return"),
			offset: z.number().optional().describe("Pagination offset"),
		},
		async ({ limit, offset }) => {
			try {
				return ok(await api.invoices.list({ limit, offset }));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"invoice_get",
		"Get a single invoice by internal ID. Returns all fields including line items, amounts (total, taxTotal, amountPaid), entity, dates, shipping info, and custom fields.",
		{ id: z.string().describe("Invoice internal ID") },
		async ({ id }) => {
			try {
				return ok(await api.invoices.get(id));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"invoice_search",
		"Search invoices by transaction ID keyword (e.g. 'INV002' to find matching invoices).",
		{
			keyword: z.string().describe("Transaction ID keyword to search"),
			limit: z.number().optional().describe("Max records to return"),
		},
		async ({ keyword, limit }) => {
			try {
				return ok(await api.invoices.search(keyword, { limit }));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"invoice_search_sql",
		"Query invoices using SuiteQL. Available columns: id, tranId, tranDate, entity, status, total, foreignAmountUnpaid, dueDate, memo. Status A=Open, B=Paid In Full.",
		{
			where: z
				.string()
				.describe(
					"SuiteQL WHERE clause, e.g. \"foreignAmountUnpaid > 0 AND entity = '1023'\"",
				),
			limit: z.number().optional().describe("Max records (default 100)"),
		},
		async ({ where, limit }) => {
			try {
				return ok(await api.invoices.searchBySQL(where, limit));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"invoice_get_overdue",
		"Get all overdue invoices — invoices with unpaid balance where due date is past. Returns id, tranId, tranDate, entity, total, foreignAmountUnpaid, dueDate ordered by due date ascending.",
		{
			limit: z
				.number()
				.optional()
				.describe("Max records to return (default 100)"),
		},
		async ({ limit }) => {
			try {
				return ok(await api.invoices.getOverdue(limit));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"invoice_create",
		"Create a new invoice in NetSuite. Required fields: entity (customer ID), item (line items). Typically created from a sales order via createdFrom field.",
		{
			data: z
				.record(z.unknown())
				.describe(
					"Invoice fields including entity, item (line items), tranDate, dueDate, memo, etc.",
				),
		},
		async ({ data }) => {
			try {
				return ok(await api.invoices.create(data));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"invoice_update",
		"Update an existing invoice by internal ID. Only the provided fields will be updated.",
		{
			id: z.string().describe("Invoice internal ID"),
			data: z.record(z.unknown()).describe("Fields to update"),
		},
		async ({ id, data }) => {
			try {
				return ok(await api.invoices.update(id, data));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"invoice_delete",
		"Delete an invoice by internal ID. This action is irreversible.",
		{ id: z.string().describe("Invoice internal ID") },
		async ({ id }) => {
			try {
				return ok(await api.invoices.delete(id));
			} catch (e) {
				return err(e);
			}
		},
	);

	// ─── Purchase Orders ──────────────────────────────────────────

	server.tool(
		"purchase_order_list",
		"List purchase orders from NetSuite. Returns paginated purchase order records.",
		{
			limit: z.number().optional().describe("Max records to return"),
			offset: z.number().optional().describe("Pagination offset"),
		},
		async ({ limit, offset }) => {
			try {
				return ok(await api.purchaseOrders.list({ limit, offset }));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"purchase_order_get",
		"Get a single purchase order by internal ID. Returns all fields including vendor (entity), line items, amounts, shipping details, approval status, and custom fields.",
		{ id: z.string().describe("Purchase order internal ID") },
		async ({ id }) => {
			try {
				return ok(await api.purchaseOrders.get(id));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"purchase_order_search",
		"Search purchase orders by transaction ID keyword (e.g. 'PO000' to find matching POs).",
		{
			keyword: z.string().describe("Transaction ID keyword to search"),
			limit: z.number().optional().describe("Max records to return"),
		},
		async ({ keyword, limit }) => {
			try {
				return ok(await api.purchaseOrders.search(keyword, { limit }));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"purchase_order_search_sql",
		"Query purchase orders using SuiteQL. Available columns: id, tranId, tranDate, entity, status, total, memo. Status codes: B=Pending Receipt, G=Fully Received, H=Closed.",
		{
			where: z
				.string()
				.describe(
					"SuiteQL WHERE clause, e.g. \"status = 'B' AND total > 5000\"",
				),
			limit: z.number().optional().describe("Max records (default 100)"),
		},
		async ({ where, limit }) => {
			try {
				return ok(await api.purchaseOrders.searchBySQL(where, limit));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"purchase_order_create",
		"Create a new purchase order. Required fields: entity (vendor ID), item (line items with item and quantity), subsidiary.",
		{
			data: z
				.record(z.unknown())
				.describe(
					"Purchase order fields including entity, item (line items), tranDate, memo, location, etc.",
				),
		},
		async ({ data }) => {
			try {
				return ok(await api.purchaseOrders.create(data));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"purchase_order_update",
		"Update an existing purchase order by internal ID. Only the provided fields will be updated.",
		{
			id: z.string().describe("Purchase order internal ID"),
			data: z.record(z.unknown()).describe("Fields to update"),
		},
		async ({ id, data }) => {
			try {
				return ok(await api.purchaseOrders.update(id, data));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"purchase_order_delete",
		"Delete a purchase order by internal ID. This action is irreversible.",
		{ id: z.string().describe("Purchase order internal ID") },
		async ({ id }) => {
			try {
				return ok(await api.purchaseOrders.delete(id));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"purchase_order_receive",
		"Create an item receipt against a purchase order. Records the physical receipt of goods into inventory. Requires createdFrom (PO internal ID) and item lines.",
		{
			data: z
				.record(z.unknown())
				.describe(
					"Item receipt data including createdFrom (PO ID), item (line items with quantities received)",
				),
		},
		async ({ data }) => {
			try {
				return ok(await api.purchaseOrders.receive(data));
			} catch (e) {
				return err(e);
			}
		},
	);

	// ─── SuiteQL (generic) ────────────────────────────────────────

	server.tool(
		"suiteql_query",
		"Execute a raw SuiteQL query against NetSuite. SuiteQL is a SQL-like language for querying NetSuite data. Supports SELECT with JOIN, WHERE, ORDER BY. Common tables: transaction, customer, item, inventoryBalance, employee, vendor.",
		{
			query: z
				.string()
				.describe(
					"Full SuiteQL query, e.g. \"SELECT id, tranId FROM transaction WHERE type = 'SalesOrd' ORDER BY tranDate DESC\"",
				),
			limit: z
				.number()
				.optional()
				.describe("Max records to return (default 100)"),
			offset: z.number().optional().describe("Pagination offset"),
		},
		async ({ query, limit, offset }) => {
			try {
				return ok(await client.suiteQL(query, { limit, offset }));
			} catch (e) {
				return err(e);
			}
		},
	);

	return server;
}
