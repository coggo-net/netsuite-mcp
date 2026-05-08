import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createServer } from "./src/server.ts";
import { logger } from "./src/logger.ts";

const sessions = new Map<string, WebStandardStreamableHTTPServerTransport>();

async function handleMcpRequest(req: Request): Promise<Response> {
	const sessionId = req.headers.get("mcp-session-id");
	logger.info({ method: req.method, session: sessionId ?? "new" }, "mcp request");

	// Existing session — route to its transport
	if (sessionId && sessions.has(sessionId)) {
		return sessions.get(sessionId)!.handleRequest(req);
	}

	// New session — create a fresh transport + server
	const transport = new WebStandardStreamableHTTPServerTransport({
		sessionIdGenerator: () => crypto.randomUUID(),
		onsessioninitialized: (id) => {
			sessions.set(id, transport);
			logger.info({ session: id }, "session initialized");
		},
		onsessionclosed: (id) => {
			sessions.delete(id);
			logger.info({ session: id }, "session closed");
		},
	});

	transport.onclose = () => {
		if (transport.sessionId) {
			sessions.delete(transport.sessionId);
		}
	};

	const server = createServer();
	await server.connect(transport);

	return transport.handleRequest(req);
}

const port = Number(process.env.PORT) || 3000;

Bun.serve({
	hostname: "0.0.0.0",
	port,
	idleTimeout: 0,
	routes: {
		"/mcp": {
			POST: (req) => handleMcpRequest(req),
			GET: (req) => handleMcpRequest(req),
			DELETE: (req) => handleMcpRequest(req),
		},
		"/health": new Response("ok"),
	},
});

logger.info({ port, hostname: "0.0.0.0" }, "NetSuite MCP server started");
