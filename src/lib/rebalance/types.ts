import type { YieldSnapshot } from "@/lib/casper/normalize";

/** A user's current position in a venue, denominated in CSPR. */
export interface Position {
  venueId: string;
  protocol: string;
  amountCspr: number;
}

/** User-configurable policy that governs the agent. */
export interface PolicyConfig {
  /** Minimum net APY improvement (fraction) required to move, e.g. 0.01 = 1%. */
  minYieldDelta: number;
  /** Max share of the portfolio allowed in any single venue (0..1). */
  maxAllocationPct: number;
  /** Moves at or below this size (CSPR) may auto-sign; larger need approval. */
  autoSignLimitCspr: number;
  /** Minimum seconds between executed rebalances. */
  cooldownSec: number;
  /** Minimum liquidity (CSPR) that must remain in a source venue after a move. */
  minRemainingLiquidityCspr: number;
  /** Max single move size (CSPR) regardless of signing path. */
  maxMoveSizeCspr: number;
  /** Allowed venue kinds. Empty = all. */
  allowedKinds: Array<YieldSnapshot["kind"]>;
  /** Risk aversion 0..1 used for risk-adjusted ranking. */
  riskAversion: number;
  /** Global pause: no moves proposed or executed. */
  paused: boolean;
  /** Emergency stop: hard kill, also invalidates delegation grants. */
  emergencyStop: boolean;
}

export interface RankedVenue {
  snapshot: YieldSnapshot;
  riskAdjustedApy: number;
  rank: number;
}

export type SigningPath = "auto" | "human_approval";

export interface RebalanceProposal {
  fromVenueId: string;
  fromProtocol: string;
  toVenueId: string;
  toProtocol: string;
  amountCspr: number;
  currentApy: number;
  targetApy: number;
  apyDelta: number;
  expectedAnnualGainCspr: number;
  signingPath: SigningPath;
  reasoning: string;
}

export interface GuardrailResult {
  allowed: boolean;
  violations: string[];
}

export const DEFAULT_POLICY: PolicyConfig = {
  minYieldDelta: 0.01,
  maxAllocationPct: 0.4,
  autoSignLimitCspr: 500,
  cooldownSec: 3600,
  minRemainingLiquidityCspr: 0,
  maxMoveSizeCspr: 10_000,
  allowedKinds: [],
  riskAversion: 0.5,
  paused: false,
  emergencyStop: false,
};
