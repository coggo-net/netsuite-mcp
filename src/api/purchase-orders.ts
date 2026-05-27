import type { ListParams, NetSuiteClient } from "../netsuite-client.ts";

const RECORD_TYPE = "purchaseOrder";

function getCreatedFromId(data: Record<string, unknown>): string {
	const createdFrom = data.createdFrom;
	if (createdFrom && typeof createdFrom === "object" && "id" in createdFrom) {
		const id = (createdFrom as { id: unknown }).id;
		if (typeof id === "string" || typeof id === "number") {
			return String(id);
		}
	}
	throw new Error(
		"purchase_order_receive requires data.createdFrom.id with the source purchase order internal ID",
	);
}

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
			const purchaseOrderId = getCreatedFromId(data);
			const body = { ...data };
			delete body.createdFrom;
			return client.transformRecord(
				RECORD_TYPE,
				purchaseOrderId,
				"itemReceipt",
				body,
			);
		},
	};
}

export type PurchaseOrderAPI = ReturnType<typeof registerPurchaseOrderAPI>;
