import type { Node } from "@xyflow/react";
import type { AgentBlockNodeData } from "@/components/studio/agent-block-node";
import type { SimulationStep, StudioAgentDefinition } from "@/lib/studio/types";
import { CSPR_CLOUD } from "@/lib/casper/config";

export function extractAgentMetadata(nodes: Node<AgentBlockNodeData>[]) {
  const llmBlock = nodes.find((n) => n.data.category === "llm");
  const mcpBlocks = nodes.filter((n) => n.data.category === "mcp");
  const skillBlocks = nodes.filter((n) => n.data.category === "skill");
  const execBlock = nodes.find(
    (n) => n.data.blockId === "exec-x402" || n.data.blockId === "exec-dry-run"
  );

  return {
    llmProvider: llmBlock?.data.params?.llmModel ?? llmBlock?.data.label,
    mcpServers: mcpBlocks.map((n) => n.data.label),
    skills: skillBlocks
      .map((n) => n.data.params?.skillName || n.data.params?.skillUrl)
      .filter(Boolean) as string[],
    executionRail:
      execBlock?.data.blockId === "exec-x402"
        ? "x402"
        : execBlock?.data.blockId === "exec-dry-run"
          ? "dry_run"
          : execBlock?.data.params?.signingPath,
  };
}

export interface FlowValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateAgentFlow(
  nodes: Node<AgentBlockNodeData>[],
  edges: { source: string; target: string }[]
): FlowValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (nodes.length === 0) {
    errors.push("Add at least one block to the canvas.");
  }

  const hasLlm = nodes.some((n) => n.data.category === "llm");
  const hasMcp = nodes.some((n) => n.data.category === "mcp");
  const hasExecution = nodes.some((n) => n.data.category === "execution");

  if (!hasLlm) warnings.push("No LLM block — agent will use the default model.");
  if (!hasMcp) warnings.push("No MCP block — agent cannot read live DeFi state.");
  if (!hasExecution) errors.push("Add an execution block (Dry Run or X402 Auto-Sign).");

  const nodeIds = new Set(nodes.map((n) => n.id));
  for (const e of edges) {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) {
      errors.push("Flow has invalid edge references.");
      break;
    }
  }

  if (nodes.length > 1 && edges.length === 0) {
    warnings.push("Blocks are not connected — wire them top-to-bottom for ordered execution.");
  }

  return { valid: errors.length === 0, errors, warnings };
}

/** Topological walk for simulation (simple linear order by edges). */
export function orderedFlowNodes(
  nodes: Node<AgentBlockNodeData>[],
  edges: { source: string; target: string }[]
): Node<AgentBlockNodeData>[] {
  if (edges.length === 0) return nodes;

  const incoming = new Map<string, number>();
  for (const n of nodes) incoming.set(n.id, 0);
  for (const e of edges) {
    incoming.set(e.target, (incoming.get(e.target) ?? 0) + 1);
  }

  const roots = nodes.filter((n) => (incoming.get(n.id) ?? 0) === 0);
  const order: Node<AgentBlockNodeData>[] = [];
  const visited = new Set<string>();
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    adj.set(e.source, [...(adj.get(e.source) ?? []), e.target]);
  }

  function walk(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    const node = nodes.find((n) => n.id === id);
    if (node) order.push(node);
    for (const next of adj.get(id) ?? []) walk(next);
  }

  for (const r of roots.length ? roots : nodes) walk(r.id);
  for (const n of nodes) {
    if (!visited.has(n.id)) order.push(n);
  }
  return order;
}

export async function simulateAgentFlow(
  agent: StudioAgentDefinition
): Promise<{ success: boolean; steps: SimulationStep[]; message: string }> {
  const validation = validateAgentFlow(agent.nodes, agent.edges);
  if (!validation.valid) {
    return {
      success: false,
      steps: [],
      message: validation.errors.join(" "),
    };
  }

  const steps: SimulationStep[] = [];
  const ordered = orderedFlowNodes(agent.nodes, agent.edges);

  for (const node of ordered) {
    const blockId = node.data.blockId ?? "";
    const label = node.data.label;
    let detail = "";
    let status: SimulationStep["status"] = "ok";

    if (node.data.category === "llm") {
      detail = `Model: ${node.data.params?.llmModel ?? "default"} · temp ${node.data.params?.temperature ?? "0.2"}`;
    } else if (node.data.category === "mcp") {
      const tools = node.data.params?.mcpTools?.length
        ? node.data.params.mcpTools.join(", ")
        : "all tools";
      detail = `${label} · tools: ${tools}`;
    } else if (node.data.category === "skill") {
      detail = node.data.params?.skillUrl ?? node.data.params?.skillName ?? "playbook attached";
    } else if (blockId === "logic-monitor") {
      detail = `Interval ${node.data.params?.intervalSec ?? "60"}s`;
    } else if (blockId === "exec-dry-run") {
      detail = "No on-chain transactions — decisions logged only";
    } else if (blockId === "exec-x402") {
      detail = `X402 facilitator: ${CSPR_CLOUD.x402FacilitatorUrl} · scope: ${node.data.params?.x402Scope ?? "rebalance"}`;
    } else if (blockId === "exec-rebalance") {
      detail = "Would call propose_rebalance → execute_rebalance via MCP";
    } else if (blockId === "exec-lp") {
      detail = "Would quote and execute LP deposit/withdraw saga";
    } else {
      detail = node.data.params?.notes ?? "Configured";
    }

    steps.push({ nodeId: node.id, blockId, label, status, detail });
  }

  return {
    success: true,
    steps,
    message: `Simulated ${steps.length} step(s) in dry-run mode.`,
  };
}
