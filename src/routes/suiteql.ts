import { z } from "zod";
import type { NetSuiteClient } from "../netsuite-client.ts";
import { defineRoute, type RouteDef } from "./framework.ts";

export function suiteqlRoutes(client: NetSuiteClient): RouteDef[] {
	return [
		defineRoute({
			method: "post",
			path: "/api/suiteql",
			operationId: "suiteql_query",
			summary: "Execute a raw SuiteQL query",
			description:
				"Execute a raw SuiteQL query against NetSuite. SuiteQL is a SQL-like language for querying NetSuite data. Supports SELECT with JOIN, WHERE, ORDER BY. Common tables: transaction, customer, item, inventoryBalance, employee, vendor.",
			body: z.object({
				query: z
					.string()
					.describe(
						"Full SuiteQL query, e.g. \"SELECT id, tranId FROM transaction WHERE type = 'SalesOrd' ORDER BY tranDate DESC\"",
					),
				limit: z
					.number()
					.optional()
					.describe("Max records to return (default 100)"),
				offset: z.number().optional().describe("Pagination offset"),
			}),
			handler: async ({ body }) =>
				client.suiteQL(body.query, {
					limit: body.limit,
					offset: body.offset,
				}),
		}),
	];
}
