/**
 * Decision policy. Turns ranked venues + current positions into a concrete,
 * guardrail-checked rebalance proposal with human-readable reasoning.
 */

import type { YieldSnapshot } from "@/lib/casper/normalize";
import { rankVenues, riskAdjustedApy } from "./rank";
import { checkGuardrails, type GuardrailContext } from "./guardrails";
import type {
  Position,
  PolicyConfig,
  RebalanceProposal,
  RankedVenue,
} from "./types";

export interface ProposeInput {
  snapshots: YieldSnapshot[];
  positions: Position[];
  policy: PolicyConfig;
  secondsSinceLastMove: number | null;
}

export interface ProposeOutput {
  ranked: RankedVenue[];
  proposal: RebalanceProposal | null;
  /** Why no move was proposed, when proposal is null. */
  noActionReason?: string;
}

function snapshotById(snapshots: YieldSnapshot[], id: string) {
  return snapshots.find((s) => s.id === id);
}

/** Size a move to respect max move size, source liquidity, and dest cap. */
function sizeMove(
  source: Position,
  destAfterCapRoom: number,
  policy: PolicyConfig
): number {
  const sourceRoom = Math.max(
    source.amountCspr - policy.minRemainingLiquidityCspr,
    0
  );
  return Math.max(
    Math.min(sourceRoom, policy.maxMoveSizeCspr, destAfterCapRoom),
    0
  );
}

export function proposeRebalance(input: ProposeInput): ProposeOutput {
  const { snapshots, positions, policy, secondsSinceLastMove } = input;
  const ranked = rankVenues(snapshots, policy);

  if (policy.paused || policy.emergencyStop) {
    return { ranked, proposal: null, noActionReason: "Agent is paused or stopped." };
  }
  if (!positions.length) {
    return { ranked, proposal: null, noActionReason: "No positions to rebalance." };
  }
  if (!ranked.length) {
    return { ranked, proposal: null, noActionReason: "No eligible venues." };
  }

  const total = positions.reduce((s, p) => s + p.amountCspr, 0);
  const best = ranked[0];
  const bestSnap = best.snapshot;

  // Evaluate moving each position into the best venue; pick the largest gain.
  let chosen: RebalanceProposal | null = null;

  for (const pos of positions) {
    if (pos.venueId === bestSnap.id) continue;

    const currentSnap = snapshotById(snapshots, pos.venueId);
    const currentApy = currentSnap?.apy ?? 0;
    const currentRiskAdj = currentSnap
      ? riskAdjustedApy(currentSnap, policy.riskAversion)
      : 0;

    const apyDelta = bestSnap.apy - currentApy;
    const riskAdjDelta = best.riskAdjustedApy - currentRiskAdj;

    // Threshold is on the risk-adjusted improvement.
    if (riskAdjDelta < policy.minYieldDelta) continue;

    const destCurrent =
      positions.find((p) => p.venueId === bestSnap.id)?.amountCspr ?? 0;
    const capRoom =
      total > 0
        ? Math.max(policy.maxAllocationPct * total - destCurrent, 0)
        : policy.maxMoveSizeCspr;

    const amount = sizeMove(pos, capRoom, policy);
    if (amount <= 0) continue;

    const expectedAnnualGainCspr = amount * apyDelta;
    if (chosen && expectedAnnualGainCspr <= chosen.expectedAnnualGainCspr) continue;

    const signingPath =
      amount <= policy.autoSignLimitCspr ? "auto" : "human_approval";

    const reasoning =
      `Move ${amount.toFixed(2)} CSPR from ${pos.protocol} ` +
      `(${(currentApy * 100).toFixed(2)}% APY, risk ${currentSnap?.riskScore ?? "?"}) ` +
      `to ${bestSnap.protocol} (${(bestSnap.apy * 100).toFixed(2)}% APY, risk ${bestSnap.riskScore}). ` +
      `Risk-adjusted improvement ${(riskAdjDelta * 100).toFixed(2)}% exceeds the ` +
      `${(policy.minYieldDelta * 100).toFixed(2)}% threshold; ` +
      `expected extra ~${expectedAnnualGainCspr.toFixed(2)} CSPR/yr. ` +
      `Signing path: ${signingPath} (limit ${policy.autoSignLimitCspr} CSPR).`;

    chosen = {
      fromVenueId: pos.venueId,
      fromProtocol: pos.protocol,
      toVenueId: bestSnap.id,
      toProtocol: bestSnap.protocol,
      amountCspr: amount,
      currentApy,
      targetApy: bestSnap.apy,
      apyDelta,
      expectedAnnualGainCspr,
      signingPath,
      reasoning,
    };
  }

  if (!chosen) {
    return {
      ranked,
      proposal: null,
      noActionReason: `No venue beats the current allocation by the ${(
        policy.minYieldDelta * 100
      ).toFixed(2)}% risk-adjusted threshold.`,
    };
  }

  // Final guardrail check on the chosen move.
  const ctx: GuardrailContext = {
    policy,
    positions,
    totalPortfolioCspr: total,
    secondsSinceLastMove,
  };
  const guard = checkGuardrails(
    {
      fromVenueId: chosen.fromVenueId,
      toVenueId: chosen.toVenueId,
      amountCspr: chosen.amountCspr,
    },
    ctx
  );
  if (!guard.allowed) {
    return {
      ranked,
      proposal: null,
      noActionReason: `Proposed move blocked by guardrails: ${guard.violations.join(" ")}`,
    };
  }

  return { ranked, proposal: chosen };
}
