/**
 * Yield ranking. Normalizes venues by risk-adjusted APY so the agent compares
 * opportunities fairly rather than chasing raw headline APY.
 */

import type { YieldSnapshot } from "@/lib/casper/normalize";
import type { PolicyConfig, RankedVenue } from "./types";

/**
 * Risk-adjusted APY = apy discounted by risk.
 * riskAversion 0 -> ignore risk; 1 -> full discount by riskScore fraction.
 */
export function riskAdjustedApy(
  snapshot: YieldSnapshot,
  riskAversion: number
): number {
  const riskFraction = Math.min(Math.max(snapshot.riskScore, 0), 100) / 100;
  const discount = 1 - riskAversion * riskFraction;
  return snapshot.apy * Math.max(discount, 0);
}

/** Rank venues by risk-adjusted APY, filtered to allowed kinds. */
export function rankVenues(
  snapshots: YieldSnapshot[],
  policy: PolicyConfig
): RankedVenue[] {
  const allowed =
    policy.allowedKinds.length === 0
      ? snapshots
      : snapshots.filter((s) => policy.allowedKinds.includes(s.kind));

  return allowed
    .map((snapshot) => ({
      snapshot,
      riskAdjustedApy: riskAdjustedApy(snapshot, policy.riskAversion),
      rank: 0,
    }))
    .sort((a, b) => b.riskAdjustedApy - a.riskAdjustedApy)
    .map((v, i) => ({ ...v, rank: i + 1 }));
}
