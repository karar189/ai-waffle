/**
 * Studio agent definitions — file-backed persistence (`.agent-data/studio-agents.json`).
 */

import { promises as fs } from "fs";
import path from "path";
import type {
  CreateAgentInput,
  StudioAgentDefinition,
  UpdateAgentInput,
} from "@/lib/studio/types";
import { extractAgentMetadata } from "@/lib/studio/validate";

const DATA_DIR = path.join(process.cwd(), ".agent-data");
const AGENTS_FILE = path.join(DATA_DIR, "studio-agents.json");

let cache: StudioAgentDefinition[] | null = null;

function newId(): string {
  return `agent_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function loadAll(): Promise<StudioAgentDefinition[]> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(AGENTS_FILE, "utf8");
    cache = JSON.parse(raw) as StudioAgentDefinition[];
    return cache;
  } catch {
    cache = [];
    return cache;
  }
}

async function persist(agents: StudioAgentDefinition[]): Promise<void> {
  cache = agents;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(AGENTS_FILE, JSON.stringify(agents, null, 2), "utf8");
  } catch {
    /* best-effort */
  }
}

export async function listStudioAgents(): Promise<StudioAgentDefinition[]> {
  const agents = await loadAll();
  return [...agents].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function getStudioAgent(id: string): Promise<StudioAgentDefinition | null> {
  const agents = await loadAll();
  return agents.find((a) => a.id === id) ?? null;
}

export async function createStudioAgent(
  input: CreateAgentInput = {}
): Promise<StudioAgentDefinition> {
  const now = new Date().toISOString();
  const nodes = input.nodes ?? [];
  const edges = input.edges ?? [];
  const meta = extractAgentMetadata(nodes);

  const agent: StudioAgentDefinition = {
    id: newId(),
    name: input.name?.trim() || "Untitled agent",
    description: input.description,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    nodes,
    edges,
    ...meta,
  };

  const agents = await loadAll();
  agents.push(agent);
  await persist(agents);
  return agent;
}

export async function updateStudioAgent(
  id: string,
  input: UpdateAgentInput
): Promise<StudioAgentDefinition | null> {
  const agents = await loadAll();
  const idx = agents.findIndex((a) => a.id === id);
  if (idx < 0) return null;

  const existing = agents[idx];
  const nodes = input.nodes ?? existing.nodes;
  const edges = input.edges ?? existing.edges;
  const meta = extractAgentMetadata(nodes);

  const updated: StudioAgentDefinition = {
    ...existing,
    ...input,
    nodes,
    edges,
    ...meta,
    lastSimulation: input.lastSimulation ?? existing.lastSimulation,
    updatedAt: new Date().toISOString(),
    deployedAt:
      input.status === "deployed" && existing.status !== "deployed"
        ? new Date().toISOString()
        : existing.deployedAt,
  };

  agents[idx] = updated;
  await persist(agents);
  return updated;
}

export async function deleteStudioAgent(id: string): Promise<boolean> {
  const agents = await loadAll();
  const next = agents.filter((a) => a.id !== id);
  if (next.length === agents.length) return false;
  await persist(next);
  return true;
}
