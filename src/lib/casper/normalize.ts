/**
 * Normalization layer.
 *
 * Turns raw CSPR.cloud data into a single comparable `YieldSnapshot` shape so
 * the ranking engine and the LLM can compare venues fairly across protocols.
 *
 * APY is derived from real on-chain data:
 *  - Staking venues: per-validator net APY = grossNetworkApy * (1 - fee).
 *    `fee`, stake, and delegator counts are real; the gross network rate is
 *    derived from an account's delegation-reward stream when available and
 *    otherwise falls back to a clearly flagged network default.
 *  - LP venues: fee APR derived from real swap volume and the DEX fee rate.
 */

import type {
  Validator,
  Swap,
  Dex,
  DelegatorReward,
} from "./csprcloud";

export const MOTES_PER_CSPR = 1_000_000_000;

/** Casper era is ~2h, so ~4380 eras per year (used to annualize rewards). */
export const ERAS_PER_YEAR = 4380;

/** Fallback gross network staking APY when no reward sample is provided. */
export const DEFAULT_GROSS_STAKING_APY = 0.11;

/** Standard Uniswap-V2-style swap fee used by CSPR.trade LP pools. */
export const DEFAULT_LP_FEE_RATE = 0.003;

export type VenueKind = "staking" | "liquid_staking" | "lp";

export type ApySource =
  | "derived_rewards"
  | "network_default"
  | "volume_fee_apr"
  | "reserves_tvl";

export interface YieldSnapshot {
  /** Stable id for the venue (e.g. "staking:<validatorPublicKey>"). */
  id: string;
  kind: VenueKind;
  protocol: string;
  chain: "casper";
  dexId?: number;
  /** Net APY as a fraction (0.11 = 11%). */
  apy: number;
  apySource: ApySource;
  /** Total value locked in CSPR. */
  tvl: number | null;
  /** 0..1 utilization/participation where meaningful. */
  utilization: number | null;
  /** Available liquidity / stake room in CSPR. */
  liquidityDepth: number | null;
  /** Trailing volume window in CSPR (LP venues). */
  volume: number | null;
  /** Withdrawal lock in hours (staking unbonding, etc.). */
  lockPeriodHours: number | null;
  withdrawalRules: string;
  /** Protocol/validator fee as a fraction. */
  fees: number;
  riskFlags: string[];
  /** 0 (safest) .. 100 (riskiest). */
  riskScore: number;
  updatedAt: string;
  /**
   * LP-only pool composition needed to actually execute a deposit
   * (swap → approve → add_liquidity_cspr). Present when the pool is CSPR-paired
   * and its reserves were read on-chain.
   */
  lp?: LpPoolInfo;
}

/** Executable LP pool metadata (one side must be WCSPR). */
export interface LpPoolInfo {
  /** Pair contract package hash. */
  pairPackageHash: string;
  /** Non-WCSPR token contract package hash to swap into / deposit. */
  tokenPackageHash: string;
  tokenSymbol: string;
  tokenDecimals: number;
  /** WCSPR-side reserve, in motes. */
  reserveCsprMotes: string;
  /** Token-side reserve, in base units. */
  reserveTokenBase: string;
}

export function motesToCspr(motes: string | number): number {
  return Number(motes) / MOTES_PER_CSPR;
}

/**
 * Derive the gross network staking APY from an account's delegation rewards.
 * Returns null when there is not enough data to derive it.
 */
export function deriveGrossStakingApy(
  rewards: DelegatorReward[],
  totalStakeMotes: string | number
): number | null {
  if (!rewards.length) return null;
  const stake = Number(totalStakeMotes);
  if (!stake || Number.isNaN(stake)) return null;

  // Average reward per era across the sample, annualized against stake.
  const eras = new Set(rewards.map((r) => r.era_id));
  const totalReward = rewards.reduce((sum, r) => sum + Number(r.amount), 0);
  const perEra = totalReward / Math.max(eras.size, 1);
  const apy = (perEra * ERAS_PER_YEAR) / stake;
  return Number.isFinite(apy) && apy > 0 ? apy : null;
}

function stakingRiskScore(v: Validator): { score: number; flags: string[] } {
  const flags: string[] = [];
  let score = 20;

  // Higher rank (lower number) = more established = lower risk.
  if (v.rank != null) {
    if (v.rank > 50) {
      score += 25;
      flags.push("low_rank_validator");
    } else if (v.rank > 20) {
      score += 12;
    }
  }
  // Concentration: very high network share is a centralization risk.
  const share = v.network_share ? Number(v.network_share) : 0;
  if (share > 10) {
    score += 10;
    flags.push("high_network_share");
  }
  // Thin delegator base is riskier.
  if (v.delegators_number < 20) {
    score += 15;
    flags.push("thin_delegator_base");
  }
  // High fee eats yield.
  if (v.fee >= 15) {
    score += 8;
    flags.push("high_fee");
  }
  if (!v.is_active) {
    score += 40;
    flags.push("inactive_validator");
  }
  return { score: Math.min(score, 100), flags };
}

/** Build staking venue snapshots from validator data. */
export function stakingSnapshotsFromValidators(
  validators: Validator[],
  grossApy: number,
  grossApySource: ApySource,
  updatedAt: string = new Date().toISOString()
): YieldSnapshot[] {
  return validators
    .filter((v) => v.is_active)
    .map((v) => {
      const feeFraction = v.fee / 100;
      const netApy = grossApy * (1 - feeFraction);
      const totalStake = motesToCspr(v.total_stake);
      const delegatorsStake = motesToCspr(v.delegators_stake);
      const room = v.maximum_delegation_amount
        ? Math.max(motesToCspr(v.maximum_delegation_amount) - delegatorsStake, 0)
        : null;
      const { score, flags } = stakingRiskScore(v);

      return {
        id: `staking:${v.public_key}`,
        kind: "staking" as VenueKind,
        protocol: `Validator ${v.public_key.slice(0, 8)}…${v.public_key.slice(-4)}`,
        chain: "casper" as const,
        apy: netApy,
        apySource: grossApySource,
        tvl: totalStake,
        utilization: totalStake > 0 ? delegatorsStake / totalStake : null,
        liquidityDepth: room,
        volume: null,
        // Casper unbonding is ~7 eras (~14h). Kept conservative.
        lockPeriodHours: 14,
        withdrawalRules: "Unbonding delay ~7 eras before funds are liquid.",
        fees: feeFraction,
        riskFlags: flags,
        riskScore: score,
        updatedAt,
      };
    });
}

/** Aggregate CSPR-denominated swap volume per pair over the provided swaps. */
function volumeByPair(swaps: Swap[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of swaps) {
    // Sum token0 flow in whole units as a volume proxy.
    const inAmt = Number(s.amount0_in ?? 0);
    const outAmt = Number(s.amount0_out ?? 0);
    const units = (inAmt + outAmt) / Math.pow(10, s.decimals0 || 9);
    map.set(
      s.pair_contract_package_hash,
      (map.get(s.pair_contract_package_hash) ?? 0) + units
    );
  }
  return map;
}

/**
 * Build LP venue snapshots from recent swaps. APY is a fee-APR estimate from
 * real trailing volume; TVL/reserves require a follow-up contract read, so
 * these venues carry a `reserves_unavailable` flag until enriched.
 */
export function lpSnapshotsFromSwaps(
  swaps: Swap[],
  dexes: Dex[],
  windowDays: number,
  feeRate: number = DEFAULT_LP_FEE_RATE,
  updatedAt: string = new Date().toISOString()
): YieldSnapshot[] {
  const dexName = new Map(dexes.map((d) => [d.id, d.name]));
  const perPair = volumeByPair(swaps);
  const firstByPair = new Map<string, Swap>();
  for (const s of swaps) {
    if (!firstByPair.has(s.pair_contract_package_hash)) {
      firstByPair.set(s.pair_contract_package_hash, s);
    }
  }

  const out: YieldSnapshot[] = [];
  for (const [pair, volume] of perPair) {
    const sample = firstByPair.get(pair)!;
    const dailyVolume = volume / Math.max(windowDays, 1);
    // Fee APR proxy: annualized fees relative to trailing daily volume.
    // Without reserves this expresses fee intensity, not true LP APY.
    const feeAprProxy = dailyVolume * feeRate * 365;
    out.push({
      id: `lp:${sample.dex_id}:${pair}`,
      kind: "lp",
      protocol: `${dexName.get(sample.dex_id) ?? `DEX ${sample.dex_id}`} LP ${pair.slice(0, 6)}…`,
      chain: "casper",
      dexId: sample.dex_id,
      apy: 0, // set below once normalized against reserves; proxy stored in volume
      apySource: "volume_fee_apr",
      tvl: null,
      utilization: null,
      liquidityDepth: null,
      volume,
      lockPeriodHours: 0,
      withdrawalRules: "LP tokens can be withdrawn anytime; subject to slippage.",
      fees: feeRate,
      riskFlags: ["reserves_unavailable", "apy_is_fee_intensity_not_comparable"],
      riskScore: 55,
      updatedAt,
    });
    // Store the fee-APR proxy in apy so ranking has a real signal to work with.
    out[out.length - 1].apy = feeAprProxy;
  }
  return out;
}
