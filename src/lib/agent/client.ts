/**
 * Browser client for the agent API. Keeps the dashboard thin and typed.
 */

import type { PolicyConfig, Position, RebalanceProposal } from "@/lib/rebalance/types";
import type { DecisionRecord, ExecutionRecord } from "./store";

export interface AgentStatus {
  running: boolean;
  policy: PolicyConfig;
  positions: Position[];
  connectedAccount: string | null;
  autoSignEnabled: boolean;
  sessionPublicKey: string | null;
  lastMoveAt: number | null;
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
};

export function explorerDeployUrl(network: string, hash: string): string {
  const base = network === "mainnet" ? "https://cspr.live" : "https://testnet.cspr.live";
  return `${base}/deploy/${hash}`;
}
