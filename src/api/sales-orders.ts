import type { ListParams, NetSuiteClient } from "../netsuite-client.ts";
import {
	autoAssignLots,
	fillInventoryDetailQuantity,
} from "./lot-assignment.ts";

const RECORD_TYPE = "salesOrder";

async function normalize(
	client: NetSuiteClient,
	data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
	await autoAssignLots(client, data);
	return fillInventoryDetailQuantity(data);
}

export function registerSalesOrderAPI(client: NetSuiteClient) {
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

		search(keyword: string, params: Omit<ListParams, "q"> = {}) {
			return client.listRecords(RECORD_TYPE, {
				...params,
				q: `tranId CONTAIN "${keyword}"`,
			});
		},
	};
}

export type SalesOrderAPI = ReturnType<typeof registerSalesOrderAPI>;
