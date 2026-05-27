import type { NetSuiteClient } from "../netsuite-client.ts";
import { registerAccountAPI } from "./accounts.ts";
import { registerCustomerAPI } from "./customers.ts";
import { registerInventoryAPI } from "./inventory.ts";
import { registerInvoiceAPI } from "./invoices.ts";
import { registerLocationAPI } from "./locations.ts";
import { registerProformaInvoiceAPI } from "./proforma-invoices.ts";
import { registerPurchaseOrderAPI } from "./purchase-orders.ts";
import { registerSalesOrderAPI } from "./sales-orders.ts";
import { registerSubsidiaryAPI } from "./subsidiaries.ts";
import { registerVendorBillAPI } from "./vendor-bills.ts";
import { registerVendorAPI } from "./vendors.ts";

export function createAPI(client: NetSuiteClient) {
	return {
		customers: registerCustomerAPI(client),
		inventory: registerInventoryAPI(client),
		salesOrders: registerSalesOrderAPI(client),
		invoices: registerInvoiceAPI(client),
		proformaInvoices: registerProformaInvoiceAPI(client),
		purchaseOrders: registerPurchaseOrderAPI(client),
		vendorBills: registerVendorBillAPI(client),
		vendors: registerVendorAPI(client),
		locations: registerLocationAPI(client),
		accounts: registerAccountAPI(client),
		subsidiaries: registerSubsidiaryAPI(client),
	};
}

export type NetSuiteAPI = ReturnType<typeof createAPI>;
