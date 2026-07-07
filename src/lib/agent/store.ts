/**
 * Agent state store (in-memory + JSON file persistence).
 *
 * Holds policy, positions, the reasoning/decision log, and executions. This is
 * the demo persistence layer; swap for Prisma/MongoDB later without touching
 * callers. File writes are best-effort so the app still works read-only.
 */

import { promises as fs } from "fs";
import path from "path";
import {
  DEFAULT_POLICY,
  type PolicyConfig,
  type Position,
  type RebalanceProposal,
  type RankedVenue,
} from "@/lib/rebalance/types";

export interface DecisionRecord {
  id: string;
  createdAt: string;
  eraId: number;
  grossStakingApy: number;
  topRanked: Array<{
    rank: number;
    protocol: string;
    apy: number;
    riskScore: number;
    riskAdjustedApy: number;
  }>;
  proposal: RebalanceProposal | null;
  noActionReason?: string;
  mode: "dry_run" | "live";
  /** Claude's reasoning + verdict for this decision, when available. */
  llm?: {
    verdict: "proceed" | "hold";
    rationale: string;
    confidence: number;
    model: string;
  };
}

export type ExecutionStatus =
  | "pending_approval"
  | "prepared"
  | "submitted"
  | "confirmed"
  | "failed"
  | "rejected";

export interface ExecutionRecord {
  id: string;
  decisionId: string;
  createdAt: string;
  fromProtocol: string;
  toProtocol: string;
  fromVenueId: string;
  toVenueId: string;
  amountCspr: number;
  expectedAnnualGainCspr: number;
  signingPath: "auto" | "human_approval";
  status: ExecutionStatus;
  deployHash?: string;
  error?: string;
  beforeAllocation: Position[];
  afterAllocation?: Position[];
}

export interface AgentState {
  running: boolean;
  policy: PolicyConfig;
  positions: Position[];
  connectedAccount?: string;
  lastMoveAt: number | null;
  decisions: DecisionRecord[];
  executions: ExecutionRecord[];
}

const DATA_DIR = path.join(process.cwd(), ".agent-data");
const STATE_FILE = path.join(DATA_DIR, "state.json");

/**
 * Demo seed positions (CSPR). Replaced by real on-chain positions once a
 * wallet is connected and delegations are read.
 */
const SEED_POSITIONS: Position[] = [
  { venueId: "idle", protocol: "Idle wallet balance", amountCspr: 1000 },
];

function freshState(): AgentState {
  return {
    running: false,
    policy: { ...DEFAULT_POLICY },
    positions: [...SEED_POSITIONS],
    lastMoveAt: null,
    decisions: [],
    executions: [],
  };
}

// Module-level singleton (persists across requests in a running dev server).
let state: AgentState | null = null;
let loaded = false;

async function load(): Promise<AgentState> {
  if (state) return state;
  if (!loaded) {
    loaded = true;
    try {
      const raw = await fs.readFile(STATE_FILE, "utf8");
      state = { ...freshState(), ...(JSON.parse(raw) as Partial<AgentState>) };
    } catch {
      state = freshState();
    }
  }
  return state ?? (state = freshState());
}

async function persist(): Promise<void> {
  if (!state) return;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch {
    /* best-effort */
  }
}

export async function getState(): Promise<AgentState> {
  return load();
}

export async function updatePolicy(patch: Partial<PolicyConfig>): Promise<PolicyConfig> {
  const s = await load();
  s.policy = { ...s.policy, ...patch };
  await persist();
  return s.policy;
}

export async function setPositions(positions: Position[]): Promise<void> {
  const s = await load();
  s.positions = positions;
  await persist();
}

export async function setConnectedAccount(account?: string): Promise<void> {
  const s = await load();
  s.connectedAccount = account;
  await persist();
}

export async function setRunning(running: boolean): Promise<void> {
  const s = await load();
  s.running = running;
  await persist();
}

export async function setEmergencyStop(stop: boolean): Promise<void> {
  const s = await load();
  s.policy.emergencyStop = stop;
  if (stop) s.running = false;
  await persist();
}

export async function addDecision(d: DecisionRecord): Promise<void> {
  const s = await load();
  s.decisions.unshift(d);
  s.decisions = s.decisions.slice(0, 200);
  await persist();
}

export async function addExecution(e: ExecutionRecord): Promise<void> {
  const s = await load();
  s.executions.unshift(e);
  s.executions = s.executions.slice(0, 200);
  await persist();
}

export async function updateExecution(
  id: string,
  patch: Partial<ExecutionRecord>
): Promise<ExecutionRecord | null> {
  const s = await load();
  const idx = s.executions.findIndex((e) => e.id === id);
  if (idx < 0) return null;
  s.executions[idx] = { ...s.executions[idx], ...patch };
  await persist();
  return s.executions[idx];
}

export async function getExecution(id: string): Promise<ExecutionRecord | null> {
  const s = await load();
  return s.executions.find((e) => e.id === id) ?? null;
}

export async function markMoveExecuted(): Promise<void> {
  const s = await load();
  s.lastMoveAt = Date.now();
  await persist();
}

export function secondsSinceLastMove(s: AgentState): number | null {
  return s.lastMoveAt === null ? null : Math.floor((Date.now() - s.lastMoveAt) / 1000);
}

export function toRankSummary(ranked: RankedVenue[], n = 5) {
  return ranked.slice(0, n).map((r) => ({
    rank: r.rank,
    protocol: r.snapshot.protocol,
    apy: r.snapshot.apy,
    riskScore: r.snapshot.riskScore,
    riskAdjustedApy: r.riskAdjustedApy,
  }));
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
