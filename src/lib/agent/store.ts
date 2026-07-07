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

/** One on-chain step within a multi-tx saga (LP deposits). */
export interface ExecutionStep {
  label: string;
  entryPoint: string;
  status: ExecutionStatus;
  deployHash?: string;
  error?: string;
}

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
  /**
   * "staking" (native, single tx), "lp" (CSPR.trade deposit saga), or
   * "lp_exit" (CSPR.trade withdraw saga: approve → remove_liquidity_cspr).
   */
  kind?: "staking" | "lp" | "lp_exit";
  /** Ordered saga steps (LP deposits: swap → approve → add_liquidity). */
  steps?: ExecutionStep[];
  /** LP token contract package hash received (LP deposits). */
  lpTokenPackageHash?: string;
  /** LP token balance received (base units). */
  lpTokensReceived?: string;
}

export interface AgentState {
  running: boolean;
  policy: PolicyConfig;
  positions: Position[];
  connectedAccount?: string;
  lastMoveAt: number | null;
  decisions: DecisionRecord[];
  executions: ExecutionRecord[];
  /** When true, the background scheduler executes (not just decides) each tick. */
  autoExecute: boolean;
  /** Seconds between autonomous background cycles. */
  autonomyIntervalSec: number;
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
    autoExecute: false,
    autonomyIntervalSec: 60,
  };
}

// Module-level singleton (persists across requests in a running dev server).
//
// IMPORTANT: the API routes and the background scheduler (started from
// instrumentation.ts) are compiled into SEPARATE bundles, so this module is
// instantiated more than once — each with its own `state`. The JSON file is the
// shared source of truth: `load()` re-reads it whenever it changed on disk
// (mtime-based) so cross-instance writes (e.g. the dashboard toggling `running`,
// the scheduler appending executions) are visible everywhere.
let state: AgentState | null = null;
let lastLoadedMtimeMs = 0;

async function readFileState(): Promise<AgentState | null> {
  try {
    const raw = await fs.readFile(STATE_FILE, "utf8");
    return { ...freshState(), ...(JSON.parse(raw) as Partial<AgentState>) };
  } catch {
    return null;
  }
}

async function load(): Promise<AgentState> {
  try {
    const st = await fs.stat(STATE_FILE);
    if (!state || st.mtimeMs > lastLoadedMtimeMs) {
      const fresh = await readFileState();
      if (fresh) {
        state = fresh;
        lastLoadedMtimeMs = st.mtimeMs;
      }
    }
  } catch {
    // File doesn't exist yet — fall through to in-memory / fresh state.
  }
  return state ?? (state = freshState());
}

async function persist(): Promise<void> {
  if (!state) return;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
    // Mark our own write as seen so we don't needlessly re-read it back.
    const st = await fs.stat(STATE_FILE);
    lastLoadedMtimeMs = st.mtimeMs;
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

export async function setAutoExecute(autoExecute: boolean): Promise<void> {
  const s = await load();
  s.autoExecute = autoExecute;
  await persist();
}

export async function setAutonomyInterval(sec: number): Promise<void> {
  const s = await load();
  s.autonomyIntervalSec = Math.max(15, Math.round(sec));
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
