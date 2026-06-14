import type { ListParams, NetSuiteClient } from "../netsuite-client.ts";
import {
	autoAssignLots,
	fillInventoryDetailQuantity,
} from "./lot-assignment.ts";

const RECORD_TYPE = "invoice";

export function registerInvoiceAPI(client: NetSuiteClient) {
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

		// Append NEW lines to an existing invoice WITHOUT replacing the item
		// sublist. The default invoice_update sends ?replace=item, which re-issues
		// every existing line's lot allocation and fails on lot-tracked invoices
		// once a prior replace has committed stock. This uses NetSuite's PATCH
		// merge mode (no ?replace) so the provided lines are appended and existing
		// lines (with their committed lots) are untouched. Lots for the new lines
		// are FIFO-auto-assigned when inventoryDetail is omitted, same as PI/SO.
		async addLines(id: string, lines: Record<string, unknown>[]) {
			const data: Record<string, unknown> = { item: { items: lines } };
			await autoAssignLots(client, data);
			fillInventoryDetailQuantity(data);
			return client.updateRecord(RECORD_TYPE, id, data, {
				replaceSublists: false,
			});
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

		getOverdue(limit = 100) {
			return client.suiteQL(
				`SELECT id, tranId, tranDate, entity, total, foreignAmountUnpaid, dueDate FROM transaction WHERE type = 'CustInvc' AND foreignAmountUnpaid > 0 AND dueDate < SYSDATE ORDER BY dueDate ASC`,
				{ limit },
			);
		},
	};
}

export type InvoiceAPI = ReturnType<typeof registerInvoiceAPI>;
