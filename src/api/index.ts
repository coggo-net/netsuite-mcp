import type { NetSuiteClient } from "../netsuite-client.ts";
import { registerCustomerAPI } from "./customers.ts";
import { registerInventoryAPI } from "./inventory.ts";
import { registerInvoiceAPI } from "./invoices.ts";
import { registerProformaInvoiceAPI } from "./proforma-invoices.ts";
import { registerPurchaseOrderAPI } from "./purchase-orders.ts";
import { registerSalesOrderAPI } from "./sales-orders.ts";

export function createAPI(client: NetSuiteClient) {
	return {
		customers: registerCustomerAPI(client),
		inventory: registerInventoryAPI(client),
		salesOrders: registerSalesOrderAPI(client),
		invoices: registerInvoiceAPI(client),
		proformaInvoices: registerProformaInvoiceAPI(client),
		purchaseOrders: registerPurchaseOrderAPI(client),
	};
}

export type NetSuiteAPI = ReturnType<typeof createAPI>;
