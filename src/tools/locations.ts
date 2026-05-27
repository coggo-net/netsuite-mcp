import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { LocationAPI } from "../api/locations.ts";
import { err, ok } from "./helpers.ts";

export function registerLocationTools(server: McpServer, api: LocationAPI) {
	server.tool(
		"location_list",
		"List locations (warehouses, stores, branches) from NetSuite via Record API GET. Returns paginated location records (id, links). Use q for NetSuite filter expressions, and limit/offset for pagination.",
		{
			q: z
				.string()
				.optional()
				.describe(
					'Optional NetSuite Record API filter expression, e.g. name CONTAIN "Warehouse"',
				),
			limit: z
				.number()
				.optional()
				.describe("Max records to return (default 100)"),
			offset: z.number().optional().describe("Pagination offset"),
		},
		async ({ q, limit, offset }) => {
			try {
				return ok(await api.list({ q, limit, offset }));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"location_get",
		"Get a single location by internal ID. Returns name, fullName, mainAddress, subsidiary, parent location, locationType, makeInventoryAvailable flag, and other configuration.",
		{ id: z.string().describe("Location internal ID") },
		async ({ id }) => {
			try {
				return ok(await api.get(id));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"location_search",
		"Search locations by name keyword. Uses NetSuite's CONTAIN operator on the `name` field for partial matches.",
		{
			keyword: z.string().describe("Location name keyword to search"),
			limit: z.number().optional().describe("Max records to return"),
		},
		async ({ keyword, limit }) => {
			try {
				return ok(await api.search(keyword, { limit }));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"location_create",
		`Create a new location record in NetSuite.

Key fields:
- name (string): Location name. Required.
- subsidiary (object): {"items":[{"id":"1"}]} — subsidiary collection. Required on OneWorld accounts. A location can belong to multiple subsidiaries.
- parent (object): {id: "..."} — parent location for hierarchy.
- locationType (object): {id: "..."} — location type reference.
- tranPrefix (string): Prefix for auto-numbered transactions at this location.
- makeInventoryAvailable (boolean): On-hand stock here is available to sell.
- defaultAllocationPriority (number): Default priority for inventory allocation.
- latitude, longitude (number): Decimal coordinates.
- isInactive (boolean): Defaults to false.

Example:
{
  "name": "Duties Unpaid Warehouse",
  "subsidiary": {"items": [{"id": "1"}]},
  "makeInventoryAvailable": true
}`,
		{
			data: z
				.record(z.string(), z.unknown())
				.describe(
					"Location record fields — see tool description for available fields and examples",
				),
		},
		async ({ data }) => {
			try {
				return ok(await api.create(data));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"location_update",
		`Update an existing location by internal ID (PATCH). Only provided fields are updated.

Updatable fields include any of those listed in location_create. Reference fields use {id: "..."} format.

Example: {"makeInventoryAvailable": true, "isInactive": false}`,
		{
			id: z.string().describe("Location internal ID"),
			data: z
				.record(z.string(), z.unknown())
				.describe(
					"Fields to update — see tool description for available fields",
				),
		},
		async ({ id, data }) => {
			try {
				return ok(await api.update(id, data));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"location_delete",
		"Delete a location by internal ID. This action is irreversible and will fail if the location is referenced by any transaction or inventory record. Prefer isInactive: true via location_update.",
		{ id: z.string().describe("Location internal ID") },
		async ({ id }) => {
			try {
				return ok(await api.delete(id));
			} catch (e) {
				return err(e);
			}
		},
	);
}
