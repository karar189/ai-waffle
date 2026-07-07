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
    title: "Get Waffle Trade yield snapshot",
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

server.registerTool(
  "get_lp_pools",
  {
    title: "List executable CSPR.trade LP pools",
    description:
      "Live CSPR-paired liquidity pools the agent can actually deposit into (real on-chain reserves + comparable APY), each with its venueId, TVL and risk. Only pools tagged executable are returned.",
    inputSchema: {},
  },
  async () => {
    const snap = await api("/api/agent/snapshot?validators=2&lp=true");
    const pools = (snap.ranked ?? []).filter(
      (r) =>
        r.kind === "lp" &&
        (r.riskFlags ?? []).includes("lp_execution_session_key_saga")
    );
    return jsonContent({
      count: pools.length,
      pools: pools.map((p) => ({
        venueId: p.id,
        protocol: p.protocol,
        apy: p.apy,
        tvl: p.tvl,
        riskScore: p.riskScore,
      })),
    });
  }
);

server.registerTool(
  "quote_lp_deposit",
  {
    title: "Preview an LP deposit (no on-chain writes)",
    description:
      "For a given LP pool (venueId from get_lp_pools) and CSPR amount, returns the swap/liquidity split, expected token out, slippage floors and estimated gas — computed from live reserves. Read-only.",
    inputSchema: {
      venueId: z.string(),
      amountCspr: z.number().positive(),
      slippageBps: z.number().int().min(0).max(10000).optional(),
    },
  },
  async ({ venueId, amountCspr, slippageBps }) => {
    const data = await api("/api/agent/lp/quote", {
      method: "POST",
      body: JSON.stringify({ venueId, amountCspr, slippageBps }),
    });
    return jsonContent(data);
  }
);

server.registerTool(
  "execute_lp_deposit",
  {
    title: "Enter an LP position via the CSPR.trade router",
    description:
      "Runs the full deposit saga for an LP pool (venueId from get_lp_pools): swap half the CSPR to the paired token, approve the router, then add_liquidity_cspr. Signs every step with the session key and confirms on-chain. Respects policy guardrails (pause/stop/allowed-kinds/max-move). Returns the execution record with each step's transaction hash.",
    inputSchema: {
      venueId: z.string(),
      amountCspr: z.number().positive(),
      slippageBps: z.number().int().min(0).max(10000).optional(),
    },
  },
  async ({ venueId, amountCspr, slippageBps }) => {
    const data = await api("/api/agent/lp/execute", {
      method: "POST",
      body: JSON.stringify({ venueId, amountCspr, slippageBps }),
    });
    return jsonContent(data);
  }
);

server.registerTool(
  "get_lp_positions",
  {
    title: "List LP positions the agent holds",
    description:
      "LP positions the session account currently holds (pair-token balance > 0), each with venueId, a rough CSPR value, and the pool APY. These are the positions execute_lp_withdraw can exit.",
    inputSchema: {},
  },
  async () => jsonContent(await api("/api/agent/lp/positions"))
);

server.registerTool(
  "quote_lp_withdraw",
  {
    title: "Preview an LP exit (no on-chain writes)",
    description:
      "For a held LP position (venueId from get_lp_positions), previews burning `percent` (1-100) or an explicit `liquidity` of LP tokens: pool share, expected token + CSPR out and slippage floors, quoted against fresh on-chain reserves and total supply. Read-only.",
    inputSchema: {
      venueId: z.string(),
      percent: z.number().min(1).max(100).optional(),
      liquidity: z.string().optional(),
      slippageBps: z.number().int().min(0).max(10000).optional(),
    },
  },
  async ({ venueId, percent, liquidity, slippageBps }) => {
    const data = await api("/api/agent/lp/withdraw/quote", {
      method: "POST",
      body: JSON.stringify({ venueId, percent, liquidity, slippageBps }),
    });
    return jsonContent(data);
  }
);

server.registerTool(
  "execute_lp_withdraw",
  {
    title: "Exit an LP position via the CSPR.trade router",
    description:
      "Runs the LP exit saga for a held position (venueId from get_lp_positions): approve the router on the LP token, then remove_liquidity_cspr to burn LP and receive the paired token + native CSPR back. Burns `percent` (1-100, default 100) or an explicit `liquidity`. Signs each step with the session key and confirms on-chain. Respects pause/emergency-stop. Returns the execution record with each step's transaction hash.",
    inputSchema: {
      venueId: z.string(),
      percent: z.number().min(1).max(100).optional(),
      liquidity: z.string().optional(),
      slippageBps: z.number().int().min(0).max(10000).optional(),
    },
  },
  async ({ venueId, percent, liquidity, slippageBps }) => {
    const data = await api("/api/agent/lp/withdraw/execute", {
      method: "POST",
      body: JSON.stringify({ venueId, percent, liquidity, slippageBps }),
    });
    return jsonContent(data);
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[casper-yield-router] MCP server ready on stdio");
