import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function createServer() {
  const server = new McpServer({
    name: "netsuite-mcp",
    version: "0.1.0",
  });

  // TODO: Register tools from NetSuite OpenAPI spec

  return server;
}
