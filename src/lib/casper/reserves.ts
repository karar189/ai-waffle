/**
 * LP reserve enrichment.
 *
 * Turns raw DEX swaps into LP `YieldSnapshot`s with a REAL, comparable APY by
 * reading on-chain pool reserves from CSPR.cloud:
 *
 *  - A pair's reserve of a token = the token balance held by the pair contract
 *    package hash (the pair hash is the `owner_hash` in ft-token-ownership).
 *  - For CSPR-quoted pools (one side is WCSPR) we anchor value to CSPR and use
 *    the standard AMM equal-value identity: TVL ≈ 2 × (WCSPR-side reserve).
 *  - Real fee APY = annualized trailing fees / TVL, where trailing fees come
 *    from the WCSPR-side swap volume × the pool fee rate.
 *
 * Each CSPR-paired pool also carries executable `lp` metadata (token hash,
 * decimals, on-chain reserves) so the agent can actually enter the position via
 * the CSPR.trade router saga (swap → approve → add_liquidity_cspr). See
 * `src/lib/agent/lp.ts`. Non-CSPR pairs remain display/ranking only.
 */

import {
  getContractPackage,
  getContractPackageTokenOwnership,
  getLatestDexRate,
  type Swap,
  type Dex,
} from "./csprcloud";
import { CSPR_CLOUD } from "./config";
import { DEFAULT_LP_FEE_RATE, type YieldSnapshot } from "./normalize";

/** Symbols we treat as 1:1 CSPR-denominated (wrapped native CSPR). */
const CSPR_QUOTE_SYMBOLS = new Set(["WCSPR", "CSPR"]);

const WCSPR_HASH = CSPR_CLOUD.wcsprPackageHash;

interface PairAgg {
  pair: string;
  dexId: number;
  token0: string;
  token1: string;
  decimals0: number;
  decimals1: number;
  /** Summed gross flow (in raw units) per token side across the window. */
  flow0: number;
  flow1: number;
}

function aggregatePairs(swaps: Swap[]): PairAgg[] {
  const map = new Map<string, PairAgg>();
  for (const s of swaps) {
    let a = map.get(s.pair_contract_package_hash);
    if (!a) {
      a = {
        pair: s.pair_contract_package_hash,
        dexId: s.dex_id,
        token0: s.token0_contract_package_hash,
        token1: s.token1_contract_package_hash,
        decimals0: s.decimals0 || 9,
        decimals1: s.decimals1 || 9,
        flow0: 0,
        flow1: 0,
      };
      map.set(s.pair_contract_package_hash, a);
    }
    a.flow0 += Number(s.amount0_in ?? 0) + Number(s.amount0_out ?? 0);
    a.flow1 += Number(s.amount1_in ?? 0) + Number(s.amount1_out ?? 0);
  }
  return [...map.values()];
}

/** Read a pair's raw reserve (base units, as string) from ft-token-ownership. */
async function readPairReserveRaw(
  tokenPkgHash: string,
  pairPkgHash: string,
  signal?: AbortSignal
): Promise<string | null> {
  const owners = await getContractPackageTokenOwnership(tokenPkgHash, {
    pageSize: 250,
    signal,
  });
  const row = owners.data.find((o) => o.owner_hash === pairPkgHash);
  return row ? String(row.balance) : null;
}

/**
 * Re-read a CSPR-paired pool's reserves fresh from chain (right before a
 * quote/execute), so pricing reflects the current pool state rather than the
 * reserves captured at snapshot time. Returns null if either side is missing.
 */
export async function readLivePairReserves(
  lp: { pairPackageHash: string; tokenPackageHash: string },
  signal?: AbortSignal
): Promise<{ reserveCsprMotes: string; reserveTokenBase: string } | null> {
  if (!WCSPR_HASH) return null;
  const [reserveCsprMotes, reserveTokenBase] = await Promise.all([
    readPairReserveRaw(WCSPR_HASH, lp.pairPackageHash, signal).catch(() => null),
    readPairReserveRaw(lp.tokenPackageHash, lp.pairPackageHash, signal).catch(() => null),
  ]);
  if (!reserveCsprMotes || !reserveTokenBase) return null;
  return { reserveCsprMotes, reserveTokenBase };
}

/**
 * Total supply of an LP (pair) token = sum of every holder's balance. The pair
 * contract package IS the LP token contract, so we page its ft-token-ownership.
 * Needed to price an exit: each LP token redeems `reserve / totalSupply` per side.
 */
export async function readPairTotalSupply(
  pairPackageHash: string,
  signal?: AbortSignal
): Promise<bigint> {
  let total = 0n;
  let page = 1;
  for (;;) {
    const res = await getContractPackageTokenOwnership(pairPackageHash, {
      page,
      pageSize: 250,
      signal,
    });
    for (const row of res.data) {
      try {
        total += BigInt(row.balance);
      } catch {
        /* skip unparseable balance */
      }
    }
    if (page >= (res.page_count || 1) || page >= 20) break;
    page += 1;
  }
  return total;
}

/** Read a pair's reserve of a token in whole units from ft-token-ownership. */
async function readPairReserve(
  tokenPkgHash: string,
  pairPkgHash: string,
  decimals: number,
  signal?: AbortSignal
): Promise<number | null> {
  const raw = await readPairReserveRaw(tokenPkgHash, pairPkgHash, signal);
  if (raw == null) return null;
  return Number(raw) / Math.pow(10, decimals);
}

/**
 * Price a token in CSPR. WCSPR (and native CSPR) is 1:1; any other token is
 * priced via its latest DEX rate against WCSPR. Returns null when unavailable.
 */
async function priceInCspr(
  tokenPkgHash: string,
  symbol: string,
  signal?: AbortSignal
): Promise<number | null> {
  if (CSPR_QUOTE_SYMBOLS.has(symbol) || tokenPkgHash === WCSPR_HASH) return 1;
  if (!WCSPR_HASH) return null;
  try {
    const rate = await getLatestDexRate(tokenPkgHash, WCSPR_HASH, undefined, signal);
    const amt = Number(rate.amount);
    return Number.isFinite(amt) && amt > 0 ? amt : null;
  } catch {
    return null;
  }
}

/**
 * Build LP snapshots with real reserves/TVL for the top pools by activity.
 * Falls back to an informational (non-comparable) snapshot when a pool can't be
 * CSPR-anchored or its reserves can't be read.
 */
export async function lpSnapshotsWithReserves(
  swaps: Swap[],
  dexes: Dex[],
  windowDays: number,
  opts: { topN?: number; feeRate?: number; signal?: AbortSignal } = {}
): Promise<YieldSnapshot[]> {
  const { topN = 6, feeRate = DEFAULT_LP_FEE_RATE, signal } = opts;
  const dexName = new Map(dexes.map((d) => [d.id, d.name]));
  const updatedAt = new Date().toISOString();

  const pairs = aggregatePairs(swaps)
    .sort((a, b) => Math.max(b.flow0, b.flow1) - Math.max(a.flow0, a.flow1))
    .slice(0, topN);

  // Cache token metadata (symbol/decimals) so repeated tokens cost one call.
  const metaCache = new Map<
    string,
    { symbol: string; decimals: number } | null
  >();
  const getMeta = async (hash: string) => {
    if (metaCache.has(hash)) return metaCache.get(hash)!;
    try {
      const pkg = await getContractPackage(hash, signal);
      const m = {
        symbol: (pkg.metadata?.symbol ?? "").toUpperCase(),
        decimals: pkg.metadata?.decimals ?? 9,
      };
      metaCache.set(hash, m);
      return m;
    } catch {
      metaCache.set(hash, null);
      return null;
    }
  };

  const out: YieldSnapshot[] = [];
  for (const p of pairs) {
    const [m0, m1] = await Promise.all([getMeta(p.token0), getMeta(p.token1)]);
    const sym0 = m0?.symbol ?? "?";
    const sym1 = m1?.symbol ?? "?";
    const label = `${dexName.get(p.dexId) ?? `DEX ${p.dexId}`} ${sym0}-${sym1}`;

    // Price both sides in CSPR (WCSPR = 1; others via DEX rate to WCSPR).
    const [price0, price1, reserve0, reserve1] = await Promise.all([
      priceInCspr(p.token0, sym0, signal),
      priceInCspr(p.token1, sym1, signal),
      readPairReserve(p.token0, p.pair, p.decimals0, signal).catch(() => null),
      readPairReserve(p.token1, p.pair, p.decimals1, signal).catch(() => null),
    ]);

    let tvl: number | null = null;
    let apy = 0;
    let apySource: YieldSnapshot["apySource"] = "volume_fee_apr";
    const riskFlags: string[] = [];

    const side0Ok = price0 != null && reserve0 != null;
    const side1Ok = price1 != null && reserve1 != null;

    if (side0Ok && side1Ok) {
      // General TVL: sum of both reserves valued in CSPR (no balance assumption).
      tvl = reserve0! * price0! + reserve1! * price1!;
    } else if (side0Ok || side1Ok) {
      // One side priced: use the AMM equal-value identity (TVL ≈ 2 × one side).
      const known = side0Ok ? reserve0! * price0! : reserve1! * price1!;
      tvl = known * 2;
      riskFlags.push("tvl_estimated_from_one_side");
    } else {
      riskFlags.push("reserves_or_price_unavailable");
    }

    // CSPR-denominated trailing volume from the priced side(s). Each swap moves
    // value through both sides, so take the max to avoid double counting while
    // staying robust when only one side is priced.
    const vol0 = side0Ok ? (p.flow0 / Math.pow(10, p.decimals0)) * price0! : 0;
    const vol1 = side1Ok ? (p.flow1 / Math.pow(10, p.decimals1)) * price1! : 0;
    const volumeCspr = Math.max(vol0, vol1);

    if (tvl && tvl > 0) {
      const dailyVolumeCspr = volumeCspr / Math.max(windowDays, 1);
      const annualFeesCspr = dailyVolumeCspr * feeRate * 365;
      apy = annualFeesCspr / tvl;
      apySource = "reserves_tvl";
    } else {
      // No real denominator → don't emit a misleading APY.
      apy = 0;
    }

    // Build executable LP metadata when one side is WCSPR (required for the
    // CSPR-in deposit path: swap → approve → add_liquidity_cspr).
    const wcsprIsToken0 = p.token0 === WCSPR_HASH;
    const wcsprIsToken1 = p.token1 === WCSPR_HASH;
    let lp: YieldSnapshot["lp"];
    if (wcsprIsToken0 || wcsprIsToken1) {
      const tokenHash = wcsprIsToken0 ? p.token1 : p.token0;
      const tokenSym = wcsprIsToken0 ? sym1 : sym0;
      const tokenDec = wcsprIsToken0 ? p.decimals1 : p.decimals0;
      const [reserveCsprMotes, reserveTokenBase] = await Promise.all([
        readPairReserveRaw(WCSPR_HASH, p.pair, signal).catch(() => null),
        readPairReserveRaw(tokenHash, p.pair, signal).catch(() => null),
      ]);
      if (reserveCsprMotes && reserveTokenBase) {
        lp = {
          pairPackageHash: p.pair,
          tokenPackageHash: tokenHash,
          tokenSymbol: tokenSym,
          tokenDecimals: tokenDec,
          reserveCsprMotes,
          reserveTokenBase,
        };
      }
    }

    if (lp) {
      // Execution is wired via the CSPR.trade router; deposits go through the
      // session-key saga (multi-tx), not the single-tx auto path.
      riskFlags.push("lp_execution_session_key_saga");
    } else {
      // Can't CSPR-anchor for execution → deposit not available for this pool.
      riskFlags.push("lp_execution_unavailable_non_cspr_pair");
    }

    out.push({
      id: `lp:${p.dexId}:${p.pair}`,
      kind: "lp",
      protocol: `${label} LP`,
      chain: "casper",
      dexId: p.dexId,
      apy,
      apySource,
      tvl,
      utilization: null,
      liquidityDepth: tvl,
      volume: volumeCspr,
      lockPeriodHours: 0,
      withdrawalRules: "LP tokens can be withdrawn anytime; subject to slippage.",
      fees: feeRate,
      riskFlags,
      // Real-TVL pools are less risky/uncertain than un-anchored ones.
      riskScore: apySource === "reserves_tvl" ? 45 : 60,
      updatedAt,
      lp,
    });
  }

  return out;
}
