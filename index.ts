import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createServer } from "./src/server.ts";

const server = createServer();

const transport = new WebStandardStreamableHTTPServerTransport({
	sessionIdGenerator: () => crypto.randomUUID(),
});

await server.connect(transport);

const port = Number(process.env.PORT) || 3000;

Bun.serve({
	port,
	routes: {
		"/mcp": {
			POST: (req) => transport.handleRequest(req),
			GET: (req) => transport.handleRequest(req),
			DELETE: (req) => transport.handleRequest(req),
		},
		"/health": new Response("ok"),
	},
});

console.log(`NetSuite MCP server running on http://localhost:${port}/mcp`);
