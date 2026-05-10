import type { NetSuiteAPI } from "../api/index.ts";
import type { NetSuiteClient } from "../netsuite-client.ts";
import { customerRoutes } from "./customers.ts";
import { buildBunRoutes, buildOpenAPISpec, type RouteDef } from "./framework.ts";
import { inventoryRoutes } from "./inventory.ts";
import { invoiceRoutes } from "./invoices.ts";
import { purchaseOrderRoutes } from "./purchase-orders.ts";
import { salesOrderRoutes } from "./sales-orders.ts";
import { suiteqlRoutes } from "./suiteql.ts";

export function createRestAPI(api: NetSuiteAPI, client: NetSuiteClient) {
	const allRoutes: RouteDef[] = [
		...customerRoutes(api.customers),
		...inventoryRoutes(api.inventory),
		...salesOrderRoutes(api.salesOrders, api.proformaInvoices),
		...invoiceRoutes(api.invoices),
		...purchaseOrderRoutes(api.purchaseOrders),
		...suiteqlRoutes(client),
	];

	return {
		routes: buildBunRoutes(allRoutes),
		openapi: buildOpenAPISpec(allRoutes),
	};
}
