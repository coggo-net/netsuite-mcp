import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AccountAPI } from "../api/accounts.ts";
import { err, ok } from "./helpers.ts";

export function registerAccountTools(server: McpServer, api: AccountAPI) {
	server.tool(
		"account_list",
		"List GL accounts (chart of accounts) from NetSuite via Record API GET. Returns paginated account records (id, links). Use q for NetSuite filter expressions, and limit/offset for pagination.",
		{
			q: z
				.string()
				.optional()
				.describe(
					'Optional NetSuite Record API filter expression, e.g. acctName CONTAIN "Expense"',
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
		"account_get",
		"Get a single GL account by internal ID. Returns acctName, acctNumber, acctType (Bank / AcctRec / AcctPay / Expense / Income / COGS / etc.), description, subsidiary, currency, balance, parent account, and flags.",
		{ id: z.string().describe("Account internal ID") },
		async ({ id }) => {
			try {
				return ok(await api.get(id));
			} catch (e) {
				return err(e);
			}
		},
	);

	server.tool(
		"account_search",
		"Search GL accounts by name keyword. Uses NetSuite's CONTAIN operator on the `acctName` field. Useful for finding A/P, A/R, expense, or revenue accounts to use in vendor bills, invoices, and journal entries.",
		{
			keyword: z.string().describe("Account name keyword to search"),
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
		"account_create",
		`Create a new GL account in NetSuite.

Key fields:
- acctName (string): Account name (max 31 chars). Required.
- acctNumber (string): Account number used for GL identification.
- acctType (object): {id: "..."} — account type reference (Bank, AcctRec, AcctPay, Expense, Income, COGS, OthCurrAsset, etc.). Required.
- description (string): Up to 255 chars.
- parent (object): {id: "..."} — parent account for hierarchy.
- subsidiary (object): {id: "1"} — primary subsidiary (OneWorld accounts).
- currency (object): {id: "1"} — account currency.
- department, location, class (object): {id: "..."} — segment restrictions.
- isInactive (boolean): Defaults to false.
- isSummary (boolean): Reporting-only summary account.
- includeChildren (boolean): Share with sub-subsidiaries.
- eliminate (boolean): Intercompany elimination.
- revalue (boolean): Include in currency revaluation.
- sBankName, sBankRoutingNumber, sBankCompanyId: Bank-account-only fields.

Example — create an expense account:
{
  "acctName": "Freight & Logistics",
  "acctType": {"id": "Expense"},
  "subsidiary": {"id": "1"}
}`,
		{
			data: z
				.record(z.string(), z.unknown())
				.describe(
					"Account record fields — see tool description for available fields and examples",
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
		"account_update",
		`Update an existing GL account by internal ID (PATCH). Only provided fields are updated.

Updatable fields include any of those listed in account_create. Reference fields use {id: "..."} format.

Example: {"description": "Updated description", "isInactive": true}`,
		{
			id: z.string().describe("Account internal ID"),
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
		"account_delete",
		"Delete a GL account by internal ID. This action is irreversible and will fail if the account has been posted to. Prefer setting isInactive: true via account_update.",
		{ id: z.string().describe("Account internal ID") },
		async ({ id }) => {
			try {
				return ok(await api.delete(id));
			} catch (e) {
				return err(e);
			}
		},
	);
}
