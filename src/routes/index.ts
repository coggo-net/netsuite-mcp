import type { NetSuiteAPI } from "../api/index.ts";
import { accountRoutes } from "./accounts.ts";
import { customerRoutes } from "./customers.ts";
import {
	buildBunRoutes,
	buildOpenAPISpec,
	type RouteDef,
} from "./framework.ts";
import { inventoryRoutes } from "./inventory.ts";
import { invoiceRoutes } from "./invoices.ts";
import { locationRoutes } from "./locations.ts";
import { purchaseOrderRoutes } from "./purchase-orders.ts";
import { salesOrderRoutes } from "./sales-orders.ts";
import { subsidiaryRoutes } from "./subsidiaries.ts";
import { vendorBillRoutes } from "./vendor-bills.ts";
import { vendorRoutes } from "./vendors.ts";

export function createRestAPI(api: NetSuiteAPI) {
	const allRoutes: RouteDef[] = [
		...customerRoutes(api.customers),
		...inventoryRoutes(api.inventory),
		...salesOrderRoutes(api.salesOrders, api.proformaInvoices),
		...invoiceRoutes(api.invoices),
		...purchaseOrderRoutes(api.purchaseOrders),
		...vendorBillRoutes(api.vendorBills),
		...vendorRoutes(api.vendors),
		...locationRoutes(api.locations),
		...accountRoutes(api.accounts),
		...subsidiaryRoutes(api.subsidiaries),
	];

	return {
		routes: buildBunRoutes(allRoutes),
		openapi: buildOpenAPISpec(allRoutes),
	};
}
