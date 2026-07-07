/**
 * Agent orchestrator: the monitor -> decide -> (prepare) rebalance pipeline.
 *
 * - monitorAndDecide: pull live snapshots, run the policy engine, log a decision.
 * - executeProposal: build the Casper transaction (delegate from idle,
 *   redelegate between validators), then either auto-sign with the session key
 *   or hand back an unsigned transaction for Casper Wallet (human approval).
 */

import { getYieldSnapshots } from "@/lib/casper/snapshots";
import { proposeRebalance } from "@/lib/rebalance/policy";
import { assessWithLlm } from "./llm";
import type { RebalanceProposal } from "@/lib/rebalance/types";
import {
  buildRedelegateTransaction,
  buildDelegateTransaction,
  serializeTransaction,
  signAndSubmit,
} from "@/lib/casper/deploy";
import { getSessionKey, getSessionPublicKeyHex } from "@/lib/casper/keys";
import {
  buildRecordIntentTransaction,
  isAgentPolicyConfigured,
} from "@/lib/casper/agent-policy";
import { findLpSnapshot, executeLpDeposit, executeLpWithdraw } from "./lp";
import {
  getState,
  addDecision,
  addExecution,
  updateExecution,
  markMoveExecuted,
  secondsSinceLastMove,
  newId,
  toRankSummary,
  type DecisionRecord,
  type ExecutionRecord,
} from "./store";

const IDLE_VENUE_ID = "idle";

function validatorHexFromVenueId(venueId: string): string | null {
  if (venueId.startsWith("staking:")) return venueId.slice("staking:".length);
  return null;
}

export interface MonitorResult {
  decision: DecisionRecord;
  proposal: RebalanceProposal | null;
}

/** Run one monitor + decide cycle and record the decision. */
export async function monitorAndDecide(
  mode: "dry_run" | "live" = "dry_run"
): Promise<MonitorResult> {
  const state = await getState();
  const { snapshots, meta } = await getYieldSnapshots({
    maxValidators: 8,
    stakingRefAccount: state.connectedAccount,
  });

  const { ranked, proposal, noActionReason } = proposeRebalance({
    snapshots,
    positions: state.positions,
    policy: state.policy,
    secondsSinceLastMove: secondsSinceLastMove(state),
  });

  // Claude in the loop: reason over the fully-computed context and give a
  // verdict. Best-effort — the agent still works if the LLM is unavailable.
  const llm =
    (await assessWithLlm({
      eraId: meta.currentEraId,
      grossStakingApy: meta.grossStakingApy,
      policy: state.policy,
      positions: state.positions,
      ranked: toRankSummary(ranked),
      proposal,
      noActionReason,
    })) ?? undefined;

  const decision: DecisionRecord = {
    id: newId("dec"),
    createdAt: new Date().toISOString(),
    eraId: meta.currentEraId,
    grossStakingApy: meta.grossStakingApy,
    topRanked: toRankSummary(ranked),
    proposal,
    noActionReason,
    mode,
    llm,
  };
  await addDecision(decision);

  return { decision, proposal };
}

export interface CycleResult {
  decision: DecisionRecord;
  proposal: RebalanceProposal | null;
  execution: ExecutionRecord | null;
  llmVetoed: boolean;
  executeError?: string;
}

/**
 * One full autonomous cycle: monitor -> decide -> (optionally) execute.
 * Shared by the /monitor route and the server-side scheduler so both paths
 * behave identically. Execution only happens when autoExecute is on, the
 * proposal is auto-signable, the LLM didn't veto, and the agent is live.
 */
export async function runAgentCycle(opts: {
  mode?: "dry_run" | "live";
  autoExecute?: boolean;
}): Promise<CycleResult> {
  const mode = opts.mode ?? "live";
  const { decision, proposal } = await monitorAndDecide(mode);
  const llmVetoed = decision.llm?.verdict === "hold";

  let execution: ExecutionRecord | null = null;
  let executeError: string | undefined;

  if (
    opts.autoExecute &&
    proposal &&
    proposal.signingPath === "auto" &&
    mode === "live" &&
    !llmVetoed
  ) {
    const state = await getState();
    if (state.running && !state.policy.paused && !state.policy.emergencyStop) {
      try {
        const result = await executeProposal(proposal, decision.id);
        execution = result.execution;
      } catch (e) {
        executeError = e instanceof Error ? e.message : "execute failed";
      }
    }
  }

  return { decision, proposal, execution, llmVetoed, executeError };
}

async function resolveAccount(): Promise<string> {
  const state = await getState();
  if (state.connectedAccount) return state.connectedAccount;
  const sessionPk = await getSessionPublicKeyHex();
  if (sessionPk) return sessionPk;
  throw new Error(
    "No account available: connect a Casper wallet or configure a session key."
  );
}

async function recordOnChainIntentIfConfigured(
  proposal: RebalanceProposal,
  decisionId: string,
  account: string
): Promise<void> {
  if (!isAgentPolicyConfigured()) return;
  const sessionKey = await getSessionKey();
  if (!sessionKey) return;
  if ((await sessionKey.publicKey.toHex()) !== account) return;

  const tx = buildRecordIntentTransaction({
    fromPublicKeyHex: account,
    decisionId,
    proposal,
  });
  await signAndSubmit(tx, sessionKey);
}

export interface ExecuteResult {
  execution: ExecutionRecord;
  /** Unsigned transaction JSON for Casper Wallet, when human approval is needed. */
  unsignedTransaction?: unknown;
}

/**
 * Execute (or prepare) a rebalance proposal.
 * Auto path: session key signs + submits when signingPath is "auto".
 * Human path: returns an unsigned transaction and records a pending execution.
 */
export async function executeProposal(
  proposal: RebalanceProposal,
  decisionId: string
): Promise<ExecuteResult> {
  const state = await getState();

  // LP source: the agent is leaving a pool → run the exit saga (approve →
  // remove_liquidity_cspr), returning CSPR to idle for the next cycle to route.
  if (proposal.fromVenueId.startsWith("lp:")) {
    const account = await getSessionPublicKeyHex();
    if (!account) {
      throw new Error(
        "LP exit needs a session key (multi-tx saga); connect/fund one to route out of LP."
      );
    }
    const snapshot = await findLpSnapshot(proposal.fromVenueId);
    if (!snapshot?.lp) {
      throw new Error(
        `LP venue ${proposal.fromVenueId} is not CSPR-executable (needs a WCSPR-paired pool).`
      );
    }
    await recordOnChainIntentIfConfigured(proposal, decisionId, account);
    return executeLpWithdraw({
      account,
      lp: snapshot.lp,
      protocol: proposal.fromProtocol,
      venueId: proposal.fromVenueId,
      percent: 100,
      decisionId,
    });
  }

  // LP destinations go through the CSPR.trade router saga (multi-tx), which
  // signs with the session key. Route there instead of the native path.
  if (proposal.toVenueId.startsWith("lp:")) {
    const account = await getSessionPublicKeyHex();
    if (!account) {
      throw new Error(
        "LP execution needs a session key (multi-tx saga); connect/fund one to route into LP."
      );
    }
    const snapshot = await findLpSnapshot(proposal.toVenueId);
    if (!snapshot?.lp) {
      throw new Error(
        `LP venue ${proposal.toVenueId} is not CSPR-executable (needs a WCSPR-paired pool).`
      );
    }
    await recordOnChainIntentIfConfigured(proposal, decisionId, account);
    return executeLpDeposit({
      account,
      lp: snapshot.lp,
      protocol: proposal.toProtocol,
      venueId: proposal.toVenueId,
      amountCspr: proposal.amountCspr,
      decisionId,
      expectedAnnualGainCspr: proposal.expectedAnnualGainCspr,
    });
  }

  const account = await resolveAccount();
  await recordOnChainIntentIfConfigured(proposal, decisionId, account);

  const toValidator = validatorHexFromVenueId(proposal.toVenueId);
  if (!toValidator) {
    throw new Error(`Destination venue ${proposal.toVenueId} is not a staking venue.`);
  }
  const fromValidator = validatorHexFromVenueId(proposal.fromVenueId);
  const isFromIdle = proposal.fromVenueId === IDLE_VENUE_ID || !fromValidator;

  // Build the appropriate transaction.
  const tx = isFromIdle
    ? buildDelegateTransaction({
        fromPublicKeyHex: account,
        validatorHex: toValidator,
        amountCspr: proposal.amountCspr,
      })
    : buildRedelegateTransaction({
        fromPublicKeyHex: account,
        oldValidatorHex: fromValidator!,
        newValidatorHex: toValidator,
        amountCspr: proposal.amountCspr,
      });

  const base: ExecutionRecord = {
    id: newId("exec"),
    decisionId,
    createdAt: new Date().toISOString(),
    fromProtocol: proposal.fromProtocol,
    toProtocol: proposal.toProtocol,
    fromVenueId: proposal.fromVenueId,
    toVenueId: proposal.toVenueId,
    amountCspr: proposal.amountCspr,
    expectedAnnualGainCspr: proposal.expectedAnnualGainCspr,
    signingPath: proposal.signingPath,
    status: "prepared",
    beforeAllocation: state.positions,
  };

  const sessionKey = await getSessionKey();

  // Auto path: sign + submit with the session key.
  if (proposal.signingPath === "auto" && sessionKey) {
    await addExecution({ ...base, status: "submitted" });
    try {
      const { transactionHash } = await signAndSubmit(tx, sessionKey);
      await markMoveExecuted();
      const updated = await updateExecution(base.id, {
        status: "submitted",
        deployHash: transactionHash,
      });
      return { execution: updated ?? { ...base, deployHash: transactionHash, status: "submitted" } };
    } catch (e) {
      const updated = await updateExecution(base.id, {
        status: "failed",
        error: e instanceof Error ? e.message : "submit failed",
      });
      return { execution: updated ?? { ...base, status: "failed" } };
    }
  }

  // Human path: record pending + return unsigned transaction for the wallet.
  const pending: ExecutionRecord = { ...base, status: "pending_approval" };
  await addExecution(pending);
  return { execution: pending, unsignedTransaction: serializeTransaction(tx) };
}
