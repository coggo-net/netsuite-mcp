import type { ListParams, NetSuiteClient } from "../netsuite-client.ts";

const RECORD_TYPE = "vendorBill";

interface ReceiptInventoryNumber {
	id?: string;
	refName?: string;
}

interface InventoryAssignmentItem {
	receiptInventoryNumber?: ReceiptInventoryNumber;
	[k: string]: unknown;
}

interface VendorBillLine {
	item?: { id?: string };
	inventoryDetail?: {
		inventoryAssignment?: { items?: InventoryAssignmentItem[] };
	};
	[k: string]: unknown;
}

interface VendorBillPayload {
	item?: { items?: VendorBillLine[] };
	[k: string]: unknown;
}

function collectInlineLots(
	data: VendorBillPayload,
): { line: VendorBillLine; assign: InventoryAssignmentItem; lot: string }[] {
	const out: {
		line: VendorBillLine;
		assign: InventoryAssignmentItem;
		lot: string;
	}[] = [];
	for (const line of data.item?.items ?? []) {
		for (const assign of line.inventoryDetail?.inventoryAssignment?.items ??
			[]) {
			const ref = assign.receiptInventoryNumber;
			if (ref?.refName && !ref.id) {
				out.push({ line, assign, lot: ref.refName });
			}
		}
	}
	return out;
}

function isInlineLotRejection(message: string): boolean {
	// NetSuite rejects inline {refName} on standalone vendor bills with one of
	// these error shapes depending on account config / record type.
	return (
		/receiptInventoryNumber/.test(message) &&
		(/INVALID_VALUE/.test(message) || /USER_ERROR/.test(message))
	);
}

function isStandaloneLotBlocked(message: string): boolean {
	return /cannot create a standalone inventory number/i.test(message);
}

export function registerVendorBillAPI(client: NetSuiteClient) {
	async function createWithLotFallback(
		data: VendorBillPayload,
	): Promise<Record<string, unknown>> {
		try {
			return await client.createRecord(RECORD_TYPE, data);
		} catch (e) {
			const message = e instanceof Error ? e.message : String(e);
			const inlineLots = collectInlineLots(data);
			if (!inlineLots.length || !isInlineLotRejection(message)) throw e;

			// Try the documented fallback: pre-create each new lot, swap to {id}, retry.
			for (const entry of inlineLots) {
				const itemId = entry.line.item?.id;
				if (!itemId) throw e;
				try {
					const lot = await client.createRecord("inventoryNumber", {
						inventoryNumber: entry.lot,
						item: { id: itemId },
					});
					const newId =
						typeof lot.id === "string"
							? lot.id
							: lot.id != null
								? String(lot.id)
								: undefined;
					if (!newId) throw new Error("Lot pre-create returned no id");
					entry.assign.receiptInventoryNumber = { id: newId };
				} catch (lotErr) {
					const lotMsg =
						lotErr instanceof Error ? lotErr.message : String(lotErr);
					if (isStandaloneLotBlocked(lotMsg)) {
						throw new Error(
							`Vendor bill rejected NetSuite's inline lot auto-create AND standalone inventoryNumber creation is blocked on this account ("${entry.lot}"). Use the PO → Item Receipt → Vendor Bill workflow instead (purchase_order_create → purchase_order_receive — lot auto-creates on the receipt — → vendor_bill_create_from_po). Original create error: ${message}`,
						);
					}
					throw new Error(
						`Vendor bill rejected inline lot auto-create for "${entry.lot}"; pre-create then failed: ${lotMsg}. Original create error: ${message}`,
					);
				}
			}

			return client.createRecord(RECORD_TYPE, data);
		}
	}

	return {
		list(params: ListParams = {}) {
			return client.listRecords(RECORD_TYPE, params);
		},

		get(id: string) {
			return client.getRecord(RECORD_TYPE, id);
		},

		create(data: Record<string, unknown>) {
			return createWithLotFallback(data as VendorBillPayload);
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
