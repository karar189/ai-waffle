/**
 * Browser client for the agent API. Keeps the dashboard thin and typed.
 */

import type { PolicyConfig, Position, RebalanceProposal } from "@/lib/rebalance/types";
import type { DecisionRecord, ExecutionRecord } from "./store";

export interface SchedulerStatus {
  started: boolean;
  ticking: boolean;
  lastTickAt: number | null;
  lastError: string | null;
  lastSummary: string | null;
  tickCount: number;
}

export interface AgentStatus {
  running: boolean;
  policy: PolicyConfig;
  positions: Position[];
  connectedAccount: string | null;
  autoSignEnabled: boolean;
  sessionPublicKey: string | null;
  lastMoveAt: number | null;
  autoExecute: boolean;
  autonomyIntervalSec: number;
  scheduler: SchedulerStatus;
  decisions: DecisionRecord[];
  executions: ExecutionRecord[];
}

export interface RankedVenueDto {
  rank: number;
  id: string;
  kind: string;
  protocol: string;
  apy: number;
  apySource: string;
  riskScore: number;
  riskAdjustedApy: number;
  tvl: number | null;
  riskFlags: string[];
}

export interface SnapshotDto {
  meta: {
    network: string;
    currentEraId: number;
    activeValidators: number;
    grossStakingApy: number;
    grossStakingApySource: string;
    capturedAt: string;
  };
  count: number;
  ranked: RankedVenueDto[];
}

export interface LpPoolDto {
  pairPackageHash: string;
  tokenPackageHash: string;
  tokenSymbol: string;
  tokenDecimals: number;
  reserveCsprMotes: string;
  reserveTokenBase: string;
}

export interface LpPlanDto {
  amountCspr: number;
  swapCspr: number;
  liquidityCspr: number;
  slippageBps: number;
  tokenSymbol: string;
  expectedTokenOut: string;
  swapMinOut: string;
  estGasCspr: number;
  reserveSource: "live_onchain" | "snapshot";
  priceImpactBps: number;
}

export interface LpQuoteDto {
  venueId: string;
  protocol: string;
  apy: number;
  pool: LpPoolDto;
  plan: LpPlanDto;
}

export interface HeldLpPositionDto {
  venueId: string;
  protocol: string;
  pairPackageHash: string;
  tokenSymbol: string;
  lpBalance: string;
  valueCspr: number | null;
  apy: number;
}

export interface LpWithdrawPlanDto {
  venueId: string;
  tokenSymbol: string;
  liquidity: string;
  poolShare: number;
  slippageBps: number;
  expectedCspr: number;
  minCspr: number;
  expectedTokenOut: string;
  tokenMinOut: string;
  reserveSource: "live_onchain" | "snapshot";
  estGasCspr: number;
}

export interface LpWithdrawQuoteDto {
  venueId: string;
  protocol: string;
  pool: LpPoolDto;
  plan: LpWithdrawPlanDto;
}

async function j<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string })?.error ?? res.statusText);
  return data as T;
}

export const agentApi = {
  status: () => fetch("/api/agent/status", { cache: "no-store" }).then(j<AgentStatus>),

  snapshot: (includeLp = false) =>
    fetch(`/api/agent/snapshot?validators=8${includeLp ? "&lp=true" : ""}`, {
      cache: "no-store",
    }).then(j<SnapshotDto>),

  monitor: (mode: "dry_run" | "live", autoExecute = false) =>
    fetch("/api/agent/monitor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, autoExecute }),
    }).then(
      j<{
        decision: DecisionRecord;
        proposal: RebalanceProposal | null;
        execution: ExecutionRecord | null;
      }>
    ),

  execute: (proposal?: RebalanceProposal, decisionId?: string) =>
    fetch("/api/agent/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposal, decisionId }),
    }).then(j<{ execution: ExecutionRecord; unsignedTransaction?: unknown }>),

  updatePolicy: (body: {
    policy?: Partial<PolicyConfig>;
    running?: boolean;
    emergencyStop?: boolean;
    positions?: Position[];
    connectedAccount?: string | null;
    autoExecute?: boolean;
    autonomyIntervalSec?: number;
  }) =>
    fetch("/api/agent/policy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(
      j<{
        running: boolean;
        policy: PolicyConfig;
        positions: Position[];
        connectedAccount: string | null;
        autoExecute: boolean;
        autonomyIntervalSec: number;
      }>
    ),

  confirm: (executionId: string) =>
    fetch("/api/agent/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ executionId }),
    }).then(j<{ execution: ExecutionRecord; pending?: boolean }>),

  approve: (body: {
    executionId: string;
    action: "approve" | "reject";
    signedTransaction?: unknown;
    unsignedTransaction?: unknown;
    signatureHex?: string;
    publicKey?: string;
  }) =>
    fetch("/api/agent/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(j<{ execution: ExecutionRecord }>),

  lpQuote: (venueId: string, amountCspr: number, slippageBps = 100) =>
    fetch("/api/agent/lp/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venueId, amountCspr, slippageBps }),
    }).then(j<LpQuoteDto>),

  lpExecute: (venueId: string, amountCspr: number, slippageBps = 100) =>
    fetch("/api/agent/lp/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venueId, amountCspr, slippageBps }),
    }).then(j<{ execution: ExecutionRecord }>),

  lpPositions: () =>
    fetch("/api/agent/lp/positions", { cache: "no-store" }).then(
      j<{ account: string | null; count?: number; positions: HeldLpPositionDto[] }>
    ),

  lpWithdrawQuote: (venueId: string, percent = 100, slippageBps = 100) =>
    fetch("/api/agent/lp/withdraw/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venueId, percent, slippageBps }),
    }).then(j<LpWithdrawQuoteDto>),

  lpWithdrawExecute: (venueId: string, percent = 100, slippageBps = 100) =>
    fetch("/api/agent/lp/withdraw/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venueId, percent, slippageBps }),
    }).then(j<{ execution: ExecutionRecord }>),
};

export function explorerDeployUrl(network: string, hash: string): string {
  const base = network === "mainnet" ? "https://cspr.live" : "https://testnet.cspr.live";
  return `${base}/deploy/${hash}`;
}
