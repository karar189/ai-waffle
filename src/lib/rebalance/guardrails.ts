/**
 * Safety guardrails. Every proposed move is checked here before any signing.
 */

import type { Position, PolicyConfig, GuardrailResult } from "./types";

export interface GuardrailContext {
  policy: PolicyConfig;
  positions: Position[];
  totalPortfolioCspr: number;
  /** Seconds since the last executed rebalance, or null if none. */
  secondsSinceLastMove: number | null;
}

export function checkGuardrails(
  move: { fromVenueId: string; toVenueId: string; amountCspr: number },
  ctx: GuardrailContext
): GuardrailResult {
  const { policy, positions, totalPortfolioCspr, secondsSinceLastMove } = ctx;
  const violations: string[] = [];

  if (policy.emergencyStop) violations.push("Emergency stop is active.");
  if (policy.paused) violations.push("Agent is paused.");

  if (move.amountCspr <= 0) violations.push("Move amount must be positive.");
  if (move.amountCspr > policy.maxMoveSizeCspr) {
    violations.push(
      `Move ${move.amountCspr} CSPR exceeds max move size ${policy.maxMoveSizeCspr} CSPR.`
    );
  }

  const source = positions.find((p) => p.venueId === move.fromVenueId);
  if (!source) {
    violations.push(`No position found in source venue ${move.fromVenueId}.`);
  } else {
    if (move.amountCspr > source.amountCspr) {
      violations.push(
        `Move ${move.amountCspr} CSPR exceeds source balance ${source.amountCspr} CSPR.`
      );
    }
    const remaining = source.amountCspr - move.amountCspr;
    if (remaining < policy.minRemainingLiquidityCspr) {
      violations.push(
        `Source would drop below min remaining liquidity ${policy.minRemainingLiquidityCspr} CSPR.`
      );
    }
  }

  // Post-move allocation cap on the destination.
  const dest = positions.find((p) => p.venueId === move.toVenueId);
  const destAfter = (dest?.amountCspr ?? 0) + move.amountCspr;
  if (totalPortfolioCspr > 0) {
    const destPct = destAfter / totalPortfolioCspr;
    if (destPct > policy.maxAllocationPct) {
      violations.push(
        `Destination allocation ${(destPct * 100).toFixed(1)}% exceeds cap ${(
          policy.maxAllocationPct * 100
        ).toFixed(1)}%.`
      );
    }
  }

  // Cooldown.
  if (
    secondsSinceLastMove !== null &&
    secondsSinceLastMove < policy.cooldownSec
  ) {
    violations.push(
      `Cooldown active: ${secondsSinceLastMove}s since last move < ${policy.cooldownSec}s.`
    );
  }

  return { allowed: violations.length === 0, violations };
}
