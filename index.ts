import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { logger } from "./src/logger.ts";
import { createMcpServer, createRestServer } from "./src/server.ts";

interface SessionEntry {
	transport: WebStandardStreamableHTTPServerTransport;
	lastAccess: number;
}

const sessions = new Map<string, SessionEntry>();

const SESSION_TTL_MS = 30 * 60 * 1000;
setInterval(() => {
	const now = Date.now();
	for (const [id, entry] of sessions) {
		if (now - entry.lastAccess > SESSION_TTL_MS) {
			sessions.delete(id);
			logger.info({ session: id }, "session expired");
		}
	}
}, 60 * 1000).unref();

async function handleMcpRequest(req: Request): Promise<Response> {
	const sessionId = req.headers.get("mcp-session-id");
	logger.info(
		{ method: req.method, session: sessionId ?? "new" },
		"mcp request",
	);

	if (sessionId) {
		const entry = sessions.get(sessionId);
		if (entry) {
			entry.lastAccess = Date.now();
			return entry.transport.handleRequest(req);
		}
	}

	const transport = new WebStandardStreamableHTTPServerTransport({
		sessionIdGenerator: () => crypto.randomUUID(),
		onsessioninitialized: (id) => {
			sessions.set(id, { transport, lastAccess: Date.now() });
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

	const server = createMcpServer();
	await server.connect(transport);

	return transport.handleRequest(req);
}

const { routes: restRoutes, openapi: openapiSpec } = createRestServer();

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
		...restRoutes,
		"/api/openapi.json": () => Response.json(openapiSpec),
		"/health": new Response("ok"),
	},
});

logger.info(
	{ port, hostname: "0.0.0.0" },
	"NetSuite MCP + OpenAPI server started",
);
