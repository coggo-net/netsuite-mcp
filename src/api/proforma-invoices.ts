import type { ListParams, NetSuiteClient } from "../netsuite-client.ts";

// Pro-Forma Invoice is a salesOrder with a custom form in NetSuite
const RECORD_TYPE = "salesOrder";

export function registerProformaInvoiceAPI(client: NetSuiteClient) {
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
			return client.listRecords(RECORD_TYPE, { ...params, q: keyword });
		},

		searchBySQL(where: string, limit = 100) {
			return client.suiteQL(
				`SELECT id, tranId, tranDate, entity, status, total, memo, dueDate FROM transaction WHERE type = 'SalesOrd' AND ${where}`,
				{ limit },
			);
		},

		listRecent(limit = 20) {
			return client.suiteQL(
				`SELECT id, tranId, tranDate, entity, status, total, memo FROM transaction WHERE type = 'SalesOrd' ORDER BY tranDate DESC`,
				{ limit },
			);
		},
	};
}

export type ProformaInvoiceAPI = ReturnType<typeof registerProformaInvoiceAPI>;
