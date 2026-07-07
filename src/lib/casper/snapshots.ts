/**
 * Snapshot aggregator.
 *
 * Fetches live CSPR.cloud data and returns a single, comparable set of
 * `YieldSnapshot`s across staking and LP venues. This is the promptable
 * "context package" the LLM/agent reasons over and the MCP `get_yield_snapshot`
 * tool returns.
 */

import {
  getAuctionMetrics,
  getValidators,
  getDexes,
  getSwaps,
  getDelegatorRewards,
  getAccountDelegations,
} from "./csprcloud";
import {
  stakingSnapshotsFromValidators,
  lpSnapshotsFromSwaps,
  deriveGrossStakingApy,
  DEFAULT_GROSS_STAKING_APY,
  type YieldSnapshot,
  type ApySource,
} from "./normalize";

export interface SnapshotOptions {
  /** How many top validators to include as staking venues. */
  maxValidators?: number;
  /** How many recent swaps to pull for LP volume aggregation. */
  swapSampleSize?: number;
  /** Window (days) the swap sample roughly covers, for volume annualization. */
  lpWindowDays?: number;
  /** Optional funded staking account to derive the real gross staking APY. */
  stakingRefAccount?: string;
  /**
   * Include LP venues alongside staking. Off by default: without pool reserves
   * the LP metric is fee intensity, not a true comparable APY, so it must not
   * pollute the risk-adjusted ranking. Enable only for informational display.
   */
  includeLp?: boolean;
  signal?: AbortSignal;
}

export interface SnapshotResult {
  snapshots: YieldSnapshot[];
  meta: {
    network: string;
    currentEraId: number;
    activeValidators: number;
    grossStakingApy: number;
    grossStakingApySource: ApySource;
    capturedAt: string;
  };
}

async function resolveGrossStakingApy(
  refAccount: string | undefined,
  signal?: AbortSignal
): Promise<{ apy: number; source: ApySource }> {
  if (refAccount) {
    try {
      const [rewards, delegations] = await Promise.all([
        getDelegatorRewards(refAccount, { pageSize: 100, signal }),
        getAccountDelegations(refAccount, { pageSize: 100, signal }),
      ]);
      // Denominator is the account's OWN total delegated stake, so the derived
      // rate reflects real yield on that account, not a network share.
      const totalStake = delegations.data.reduce(
        (sum, d) => sum + Number(d.stake),
        0
      );
      const derived = deriveGrossStakingApy(rewards.data, totalStake);
      if (derived) return { apy: derived, source: "derived_rewards" };
    } catch {
      /* fall through to default */
    }
  }
  return { apy: DEFAULT_GROSS_STAKING_APY, source: "network_default" };
}

/** Fetch and normalize all yield venues into one comparable set. */
export async function getYieldSnapshots(
  opts: SnapshotOptions = {}
): Promise<SnapshotResult> {
  const {
    maxValidators = 8,
    swapSampleSize = 250,
    lpWindowDays = 1,
    stakingRefAccount,
    includeLp = false,
    signal,
  } = opts;

  const capturedAt = new Date().toISOString();
  const auction = await getAuctionMetrics(signal);

  const [validatorsPage, grossApy] = await Promise.all([
    getValidators(auction.current_era_id, { pageSize: maxValidators, signal }),
    resolveGrossStakingApy(stakingRefAccount, signal),
  ]);

  const staking = stakingSnapshotsFromValidators(
    validatorsPage.data,
    grossApy.apy,
    grossApy.source,
    capturedAt
  );

  let lp: YieldSnapshot[] = [];
  if (includeLp) {
    try {
      const [dexes, swaps] = await Promise.all([
        getDexes(signal),
        getSwaps({ pageSize: swapSampleSize, signal }),
      ]);
      lp = lpSnapshotsFromSwaps(swaps.data, dexes, lpWindowDays, undefined, capturedAt);
    } catch {
      /* LP venues are best-effort; staking is the core set */
    }
  }

  return {
    snapshots: [...staking, ...lp],
    meta: {
      network: process.env.CASPER_NETWORK === "mainnet" ? "mainnet" : "testnet",
      currentEraId: auction.current_era_id,
      activeValidators: auction.active_validator_number,
      grossStakingApy: grossApy.apy,
      grossStakingApySource: grossApy.source,
      capturedAt,
    },
  };
}
