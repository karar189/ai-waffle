import type { Edge, Node } from "@xyflow/react";
import type { AgentBlockNodeData } from "@/components/studio/agent-block-node";

export type AgentStatus = "draft" | "simulated" | "deployed" | "archived";

export type StudioFlowNode = Node<AgentBlockNodeData>;
export type StudioFlowEdge = Edge;

export interface StudioAgentDefinition {
  id: string;
  name: string;
  description?: string;
  status: AgentStatus;
  createdAt: string;
  updatedAt: string;
  deployedAt?: string;
  nodes: StudioFlowNode[];
  edges: StudioFlowEdge[];
  /** Resolved LLM provider from flow (first llm block). */
  llmProvider?: string;
  /** Resolved MCP servers from flow. */
  mcpServers?: string[];
  /** Skill.md references attached in the flow. */
  skills?: string[];
  /** Execution rail: dry_run | x402 | human_approval */
  executionRail?: string;
  lastSimulation?: {
    at: string;
    success: boolean;
    steps: SimulationStep[];
    message?: string;
  };
}

export interface SimulationStep {
  nodeId: string;
  blockId?: string;
  label: string;
  status: "ok" | "skipped" | "error";
  detail?: string;
}

export interface CreateAgentInput {
  name?: string;
  description?: string;
  nodes?: StudioFlowNode[];
  edges?: StudioFlowEdge[];
}

export interface UpdateAgentInput {
  name?: string;
  description?: string;
  status?: AgentStatus;
  nodes?: StudioFlowNode[];
  edges?: StudioFlowEdge[];
  lastSimulation?: StudioAgentDefinition["lastSimulation"];
}
