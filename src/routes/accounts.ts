import type { AccountAPI } from "../api/accounts.ts";
import {
	defineRoute,
	paginationQuery,
	type RouteDef,
	searchQuery,
} from "./framework.ts";
import { accountBody, accountBodyPartial } from "./schemas.ts";

export function accountRoutes(api: AccountAPI): RouteDef[] {
	return [
		defineRoute({
			method: "get",
			path: "/api/accounts",
			operationId: "account_list",
			summary: "List GL accounts",
			description:
				"List GL accounts (chart of accounts) from NetSuite. Returns paginated account records (id, links). Use limit/offset for pagination.",
			query: paginationQuery,
			handler: async ({ query }) => api.list(query),
		}),
		defineRoute({
			method: "get",
			path: "/api/accounts/search",
			operationId: "account_search",
			summary: "Search accounts by name",
			description:
				"Search GL accounts by name keyword. Uses NetSuite's CONTAIN operator on the `acctName` field. Useful for finding A/P, A/R, expense, or revenue accounts to use in vendor bills, invoices, and journal entries.",
			query: searchQuery,
			handler: async ({ query }) =>
				api.search(query.keyword, { limit: query.limit }),
		}),
		defineRoute({
			method: "get",
			path: "/api/accounts/:id",
			operationId: "account_get",
			summary: "Get an account by ID",
			description:
				"Get a single GL account by internal ID. Returns acctName, acctNumber, acctType (Bank / AcctRec / AcctPay / Expense / Income / COGS / etc.), description, subsidiary, currency, balance, parent account, and flags.",
			handler: async ({ params }) => api.get(params.id),
		}),
		defineRoute({
			method: "post",
			path: "/api/accounts",
			operationId: "account_create",
			summary: "Create a GL account",
			description: "Create a new GL account in NetSuite.",
			body: accountBody,
			successStatus: 201,
			handler: async ({ body }) => api.create(body),
		}),
		defineRoute({
			method: "patch",
			path: "/api/accounts/:id",
			operationId: "account_update",
			summary: "Update a GL account",
			description:
				"Update an existing GL account by internal ID (PATCH). Only provided fields are updated.",
			body: accountBodyPartial,
			handler: async ({ params, body }) => api.update(params.id, body),
		}),
		defineRoute({
			method: "delete",
			path: "/api/accounts/:id",
			operationId: "account_delete",
			summary: "Delete a GL account",
			description:
				"Delete a GL account by internal ID. Will fail if the account has been posted to. Prefer isInactive: true.",
			handler: async ({ params }) => api.delete(params.id),
		}),
	];
}
