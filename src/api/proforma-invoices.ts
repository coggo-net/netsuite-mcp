import type { ListParams, NetSuiteClient } from "../netsuite-client.ts";
import {
	autoAssignLots,
	fillInventoryDetailQuantity,
} from "./lot-assignment.ts";

// Pro-Forma Invoice is a salesOrder with a custom form in NetSuite
const RECORD_TYPE = "salesOrder";

async function normalize(
	client: NetSuiteClient,
	data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
	await autoAssignLots(client, data);
	return fillInventoryDetailQuantity(data);
}

export function registerProformaInvoiceAPI(client: NetSuiteClient) {
	return {
		list(params: ListParams = {}) {
			return client.listRecords(RECORD_TYPE, params);
		},

		get(id: string) {
			return client.getRecord(RECORD_TYPE, id);
		},

		async create(data: Record<string, unknown>) {
			return client.createRecord(RECORD_TYPE, await normalize(client, data));
		},

		async update(id: string, data: Record<string, unknown>) {
			return client.updateRecord(
				RECORD_TYPE,
				id,
				await normalize(client, data),
			);
		},

		delete(id: string) {
			return client.deleteRecord(RECORD_TYPE, id);
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
