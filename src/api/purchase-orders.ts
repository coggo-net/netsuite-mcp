import type { ListParams, NetSuiteClient } from "../netsuite-client.ts";

const RECORD_TYPE = "purchaseOrder";

export function registerPurchaseOrderAPI(client: NetSuiteClient) {
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
				`SELECT id, tranId, tranDate, entity, status, total, memo FROM transaction WHERE type = 'PurchOrd' AND ${where}`,
				{ limit },
			);
		},

		receive(data: Record<string, unknown>) {
			return client.createRecord("itemReceipt", data);
		},
	};
}

export type PurchaseOrderAPI = ReturnType<typeof registerPurchaseOrderAPI>;
