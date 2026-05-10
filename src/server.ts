import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createAPI, type NetSuiteAPI } from "./api/index.ts";
import { createNetSuiteClient, type NetSuiteClient } from "./netsuite-client.ts";
import { createRestAPI } from "./routes/index.ts";
import { registerCustomerTools } from "./tools/customers.ts";
import { registerInventoryTools } from "./tools/inventory.ts";
import { registerInvoiceTools } from "./tools/invoices.ts";
import { registerPurchaseOrderTools } from "./tools/purchase-orders.ts";
import { registerSalesOrderTools } from "./tools/sales-orders.ts";
import { registerSuiteQLTools } from "./tools/suiteql.ts";

let sharedClient: NetSuiteClient | null = null;
let sharedAPI: NetSuiteAPI | null = null;

function getShared() {
	if (!sharedClient) sharedClient = createNetSuiteClient();
	if (!sharedAPI) sharedAPI = createAPI(sharedClient);
	return { client: sharedClient, api: sharedAPI };
}

export function createMcpServer() {
	const { client, api } = getShared();
	const server = new McpServer({
		name: "netsuite-mcp",
		version: "0.1.0",
	});

	registerCustomerTools(server, api.customers);
	registerInventoryTools(server, api.inventory);
	registerSalesOrderTools(server, api.salesOrders, api.proformaInvoices);
	registerInvoiceTools(server, api.invoices);
	registerPurchaseOrderTools(server, api.purchaseOrders);
	registerSuiteQLTools(server, client);

	return server;
}

export function createRestServer() {
	const { client, api } = getShared();
	return createRestAPI(api, client);
}
