import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createAPI, type NetSuiteAPI } from "./api/index.ts";
import {
	createNetSuiteClient,
	type NetSuiteClient,
} from "./netsuite-client.ts";
import { createRestAPI } from "./routes/index.ts";
import { registerAccountTools } from "./tools/accounts.ts";
import { registerCustomerTools } from "./tools/customers.ts";
import { registerInventoryTools } from "./tools/inventory.ts";
import { registerInvoiceTools } from "./tools/invoices.ts";
import { registerLocationTools } from "./tools/locations.ts";
import { registerPurchaseOrderTools } from "./tools/purchase-orders.ts";
import { registerSalesOrderTools } from "./tools/sales-orders.ts";
import { registerSubsidiaryTools } from "./tools/subsidiaries.ts";
import { registerVendorBillTools } from "./tools/vendor-bills.ts";
import { registerVendorTools } from "./tools/vendors.ts";

let shared: { client: NetSuiteClient; api: NetSuiteAPI } | null = null;

function getShared() {
	if (!shared) {
		const client = createNetSuiteClient();
		shared = { client, api: createAPI(client) };
	}
	return shared;
}

export function createMcpServer() {
	const { api } = getShared();
	const server = new McpServer({
		name: "netsuite-mcp",
		version: "0.1.0",
	});

	registerCustomerTools(server, api.customers);
	registerInventoryTools(server, api.inventory);
	registerSalesOrderTools(server, api.salesOrders, api.proformaInvoices);
	registerInvoiceTools(server, api.invoices);
	registerPurchaseOrderTools(server, api.purchaseOrders);
	registerVendorBillTools(server, api.vendorBills);
	registerVendorTools(server, api.vendors);
	registerLocationTools(server, api.locations);
	registerAccountTools(server, api.accounts);
	registerSubsidiaryTools(server, api.subsidiaries);

	return server;
}

export function createRestServer() {
	const { api } = getShared();
	return createRestAPI(api);
}
