/**
 * Casper Yield-Router MCP server.
 *
 * Authors our own MCP tools over the agent backend so any MCP client
 * (Cursor, Claude Desktop, Codex) can drive the monitor -> decide -> rebalance
 * loop. Tools are a thin, well-typed MCP surface over the Next.js agent API,
 * which in turn reads real Casper data from CSPR.cloud.
 *
 * Run: node --env-file=.env mcp-server/server.mjs
 * Env: AGENT_API_BASE (default http://localhost:3001)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const AGENT_API_BASE = process.env.AGENT_API_BASE ?? "http://localhost:3001";

async function api(path, init) {
  const res = await fetch(new URL(path, AGENT_API_BASE), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!res.ok) {
    throw new Error(
      `Agent API ${path} failed (${res.status}): ${
        typeof body === "string" ? body : JSON.stringify(body)
      }`
    );
  }
  return body;
}

function jsonContent(data) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

const server = new McpServer({
  name: "casper-yield-router",
  version: "0.1.0",
});

server.registerTool(
  "get_yield_snapshot",
  {
    title: "Get Casper yield snapshot",
    description:
      "Live, normalized, risk-adjusted ranking of Casper yield venues (validators; LP optional). Real data from CSPR.cloud.",
    inputSchema: { includeLp: z.boolean().optional() },
  },
  async ({ includeLp }) => {
    const data = await api(
      `/api/agent/snapshot?validators=8${includeLp ? "&lp=true" : ""}`
    );
    return jsonContent(data);
  }
);

server.registerTool(
  "get_wallet_state",
  {
    title: "Get wallet / portfolio state",
    description:
      "Current allocation, positions, connected account, and whether auto-sign is enabled.",
    inputSchema: {},
  },
  async () => {
    const s = await api("/api/agent/status");
    return jsonContent({
      connectedAccount: s.connectedAccount,
      autoSignEnabled: s.autoSignEnabled,
      positions: s.positions,
      running: s.running,
    });
  }
);

server.registerTool(
  "get_agent_status",
  {
    title: "Get full agent status",
    description:
      "Policy, positions, recent decisions (reasoning log), and executions.",
    inputSchema: {},
  },
  async () => jsonContent(await api("/api/agent/status"))
);

server.registerTool(
  "propose_rebalance",
  {
    title: "Propose a rebalance (dry-run decision)",
    description:
      "Runs one monitor -> decide cycle: ranks venues, applies policy + guardrails, and returns a proposal with reasoning. Does not execute.",
    inputSchema: { mode: z.enum(["dry_run", "live"]).optional() },
  },
  async ({ mode }) => {
    const data = await api("/api/agent/monitor", {
      method: "POST",
      body: JSON.stringify({ mode: mode ?? "dry_run" }),
    });
    return jsonContent(data);
  }
);

server.registerTool(
  "execute_rebalance",
  {
    title: "Execute a rebalance proposal",
    description:
      "Executes the latest (or a supplied) proposal. Auto-signs small moves via the session key; larger moves return an unsigned transaction for Casper Wallet.",
    inputSchema: {
      proposal: z.record(z.any()).optional(),
      decisionId: z.string().optional(),
    },
  },
  async ({ proposal, decisionId }) => {
    const data = await api("/api/agent/execute", {
      method: "POST",
      body: JSON.stringify({ proposal, decisionId }),
    });
    return jsonContent(data);
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[casper-yield-router] MCP server ready on stdio");
