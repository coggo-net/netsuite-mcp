import { createNetSuiteClient } from "../src/netsuite-client.ts";

const client = createNetSuiteClient();

console.log(
	"Fetching full NetSuite OpenAPI spec (this may take a few minutes)...",
);

const spec = await client.request("GET", "/record/v1/metadata-catalog", {
	headers: { Accept: "application/swagger+json" },
	timeout: 600_000,
});

const outPath = "openapi.json";
await Bun.write(outPath, JSON.stringify(spec, null, 2));

const size = (await Bun.file(outPath).size) / 1024 / 1024;
console.log(`OpenAPI spec saved to ${outPath} (${size.toFixed(1)} MB)`);
