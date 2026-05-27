import type { ListParams, NetSuiteClient } from "../netsuite-client.ts";

const RECORD_TYPE = "inventoryItem";

function assertNumericId(value: string, field: string): void {
	if (!/^\d+$/.test(value)) {
		throw new Error(
			`${field} must be a numeric NetSuite internal ID, got: ${value}`,
		);
	}
}

export function registerInventoryAPI(client: NetSuiteClient) {
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
				q: `itemId CONTAIN "${keyword}"`,
			});
		},

		queryStock(itemIds: string[]) {
			for (const id of itemIds) assertNumericId(id, "itemId");
			const ids = itemIds.map((id) => `'${id}'`).join(",");
			return client.suiteQL(
				`SELECT item.id, item.itemId, item.displayName, SUM(bal.quantityOnHand) AS quantityOnHand, SUM(bal.quantityAvailable) AS quantityAvailable, SUM(bal.quantityOnOrder) AS quantityOnOrder FROM inventoryBalance bal JOIN item ON bal.item = item.id WHERE item.id IN (${ids}) GROUP BY item.id, item.itemId, item.displayName`,
				{ limit: 1000 },
			);
		},

		createLot(data: Record<string, unknown>) {
			return client.createRecord("inventoryNumber", data);
		},

		searchLotNumbers(itemId: string, locationId?: string) {
			assertNumericId(itemId, "itemId");
			if (locationId) assertNumericId(locationId, "locationId");
			const locationFilter = locationId
				? `AND bal.location = '${locationId}'`
				: "";
			return client.suiteQL(
				`SELECT inv.id, inv.inventoryNumber, inv.expirationDate, bal.location, SUM(bal.quantityOnHand) AS quantityOnHand, SUM(bal.quantityAvailable) AS quantityAvailable FROM inventoryNumber inv JOIN inventoryBalance bal ON bal.inventoryNumber = inv.id WHERE inv.item = '${itemId}' ${locationFilter} GROUP BY inv.id, inv.inventoryNumber, inv.expirationDate, bal.location HAVING SUM(bal.quantityOnHand) > 0 ORDER BY inv.id ASC`,
				{ limit: 500 },
			);
		},

		adjustInventory(data: Record<string, unknown>) {
			return client.createRecord("inventoryAdjustment", data);
		},

		transferInventory(data: Record<string, unknown>) {
			return client.createRecord("inventoryTransfer", data);
		},
	};
}

export type InventoryAPI = ReturnType<typeof registerInventoryAPI>;
