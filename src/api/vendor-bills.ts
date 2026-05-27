import type { ListParams, NetSuiteClient } from "../netsuite-client.ts";

const RECORD_TYPE = "vendorBill";

export function registerVendorBillAPI(client: NetSuiteClient) {
	return {
		list(params: ListParams = {}) {
			return client.listRecords(RECORD_TYPE, params);
		},

		get(id: string) {
			return client.getRecord(RECORD_TYPE, id);
		},

		create(data: Record<string, unknown>) {
			return client.createRecord(RECORD_TYPE, data);
		},

		update(id: string, data: Record<string, unknown>) {
			return client.updateRecord(RECORD_TYPE, id, data);
		},

		delete(id: string) {
			return client.deleteRecord(RECORD_TYPE, id);
		},

		search(keyword: string, params: Omit<ListParams, "q"> = {}) {
			return client.listRecords(RECORD_TYPE, {
				...params,
				q: `tranId CONTAIN "${keyword}"`,
			});
		},

		searchBySQL(where: string, limit = 100) {
			return client.suiteQL(
				`SELECT id, tranId, tranDate, entity, status, total, foreignAmountUnpaid, dueDate, memo FROM transaction WHERE type = 'VendBill' AND ${where}`,
				{ limit },
			);
		},

		getOverdue(limit = 100) {
			return client.suiteQL(
				`SELECT id, tranId, tranDate, entity, total, foreignAmountUnpaid, dueDate FROM transaction WHERE type = 'VendBill' AND foreignAmountUnpaid > 0 AND dueDate < SYSDATE ORDER BY dueDate ASC`,
				{ limit },
			);
		},

		async createFromPurchaseOrder(
			purchaseOrderId: string,
			data: Record<string, unknown> = {},
		) {
			return client.transformRecord(
				"purchaseOrder",
				purchaseOrderId,
				"vendorBill",
				data,
			);
		},
	};
}

export type VendorBillAPI = ReturnType<typeof registerVendorBillAPI>;
