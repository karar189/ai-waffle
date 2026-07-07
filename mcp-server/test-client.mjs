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

// LP tools (read-only): list executable pools, then quote a deposit on the first.
const lp = await client.callTool({ name: "get_lp_pools", arguments: {} });
const lpText = lp.content?.[0]?.text ?? "{}";
console.log("\nget_lp_pools ->", lpText.slice(0, 400));

const firstVenue = JSON.parse(lpText)?.pools?.[0]?.venueId;
if (firstVenue) {
  const q = await client.callTool({
    name: "quote_lp_deposit",
    arguments: { venueId: firstVenue, amountCspr: 10 },
  });
  console.log("\nquote_lp_deposit ->", (q.content?.[0]?.text ?? "").slice(0, 500));
}

// LP exit tools (read-only): list held positions, then quote a withdraw if any.
const pos = await client.callTool({ name: "get_lp_positions", arguments: {} });
const posText = pos.content?.[0]?.text ?? "{}";
console.log("\nget_lp_positions ->", posText.slice(0, 400));

const heldVenue = JSON.parse(posText)?.positions?.[0]?.venueId;
if (heldVenue) {
  const wq = await client.callTool({
    name: "quote_lp_withdraw",
    arguments: { venueId: heldVenue, percent: 100 },
  });
  console.log("\nquote_lp_withdraw ->", (wq.content?.[0]?.text ?? "").slice(0, 500));
}

await client.close();
process.exit(0);
