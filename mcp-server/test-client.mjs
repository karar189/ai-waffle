/**
 * Quick MCP smoke test: spawns the yield-router server over stdio, lists tools,
 * and calls get_yield_snapshot + propose_rebalance.
 *
 * Run: node --env-file=.env mcp-server/test-client.mjs
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["--env-file=.env", "mcp-server/server.mjs"],
  env: process.env,
});

const client = new Client({ name: "smoke-test", version: "0.1.0" });
await client.connect(transport);

const { tools } = await client.listTools();
console.log(
  "TOOLS:",
  tools.map((t) => t.name).join(", ")
);

const snap = await client.callTool({
  name: "get_yield_snapshot",
  arguments: {},
});
const snapText = snap.content?.[0]?.text ?? "";
console.log("\nget_yield_snapshot ->", snapText.slice(0, 300));

const prop = await client.callTool({
  name: "propose_rebalance",
  arguments: { mode: "dry_run" },
});
const propText = prop.content?.[0]?.text ?? "";
console.log("\npropose_rebalance ->", propText.slice(0, 500));

await client.close();
process.exit(0);
