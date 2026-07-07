/**
 * CSPR.trade DEX execution layer (server-side).
 *
 * Builds the transactions the agent needs to enter AND exit an LP position:
 *   enter: 1. swap CSPR -> token   (acquire the paired asset)
 *          2. approve router       (CEP-18 allowance on the token)
 *          3. add_liquidity_cspr   (deposit CSPR + token, receive LP tokens)
 *   exit:  1. approve router       (allowance on the pair/LP token)
 *          2. remove_liquidity_cspr (burn LP, receive token + native CSPR)
 *
 * Pricing helpers (quoteAmountOut / quoteRemoveLiquidity / priceImpactBps)
 * replicate the router's get_amounts_out math against freshly-read on-chain
 * reserves — Casper has no eth_call-style read-only contract call, so exact
 * quoting means applying the same constant-product formula the router uses.
 *
 * CSPR.trade is a Uniswap-V2-style AMM. Sending native CSPR into the router
 * requires a `proxy_caller` session WASM that funds a purse and forwards the
 * call — this is CSPR.trade's documented pattern (execution_type = session).
 *
 * NOTE ON TRUST: proxy_caller.wasm is CSPR.trade's session binary, vendored
 * here from a public reference implementation. It sits in the signing path, so
 * on mainnet you should replace it with the official binary from CSPR.trade.
 * The router package/entry-point signatures below were verified live against
 * the on-chain contract via query_global_state.
 */

import fs from "fs";
import path from "path";
import {
  PublicKey,
  Key,
  Hash,
  Args,
  CLValue,
  CLTypeUInt8,
  CLTypeKey,
  SessionBuilder,
  ContractCallBuilder,
  Transaction,
} from "casper-js-sdk";
import { CSPR_TRADE } from "./config";
import { CHAIN_NAME, csprToMotes, csprToMotesNumber } from "./deploy";

/** Default gas for a router session call (observed swap cost ~15-30 CSPR). */
const DEFAULT_ROUTER_PAYMENT_CSPR = 30;
/** Default gas for a plain CEP-18 approve. */
const DEFAULT_APPROVE_PAYMENT_CSPR = 5;
/** Default swap/deposit deadline window. */
const DEFAULT_DEADLINE_MS = 10 * 60 * 1000;

let cachedWasm: Uint8Array | null = null;

/** Load and cache the CSPR.trade proxy_caller session WASM. */
function loadProxyWasm(): Uint8Array {
  if (cachedWasm) return cachedWasm;
  const candidates = [
    path.join(process.cwd(), "src/lib/casper/wasm/proxy_caller.wasm"),
    path.join(__dirname, "wasm/proxy_caller.wasm"),
  ];
  for (const p of candidates) {
    try {
      cachedWasm = new Uint8Array(fs.readFileSync(p));
      return cachedWasm;
    } catch {
      // try next candidate
    }
  }
  throw new Error(
    "proxy_caller.wasm not found. Expected at src/lib/casper/wasm/proxy_caller.wasm"
  );
}

/** A CEP-18 token / WCSPR identified by its contract package hash (hex). */
function hashKey(packageHashHex: string): CLValue {
  return CLValue.newCLKey(Key.newKey(`hash-${packageHashHex}`));
}

function accountKey(publicKeyHex: string): CLValue {
  const accountHash = PublicKey.fromHex(publicKeyHex).accountHash().toHex();
  return CLValue.newCLKey(Key.newKey(`account-hash-${accountHash}`));
}

/**
 * Wrap an inner router RuntimeArgs into the proxy_caller call that attaches
 * `amountCsprMotes` of native CSPR and forwards to `entryPoint` on the router.
 */
function buildProxyRouterTx(
  fromPublicKeyHex: string,
  entryPoint: string,
  innerArgs: Args,
  amountCsprMotes: string,
  paymentCspr: number
): Transaction {
  const serializedArgs = CLValue.newCLList(
    CLTypeUInt8,
    Array.from(innerArgs.toBytes()).map((v) => CLValue.newCLUint8(v))
  );

  const proxyArgs = Args.fromMap({
    amount: CLValue.newCLUInt512(amountCsprMotes),
    attached_value: CLValue.newCLUInt512(amountCsprMotes),
    entry_point: CLValue.newCLString(entryPoint),
    package_hash: CLValue.newCLByteArray(
      Hash.fromHex(CSPR_TRADE.routerPackageHash).toBytes()
    ),
    args: serializedArgs,
  });

  return new SessionBuilder()
    .from(PublicKey.fromHex(fromPublicKeyHex))
    .runtimeArgs(proxyArgs)
    .wasm(loadProxyWasm())
    .payment(csprToMotesNumber(paymentCspr))
    .chainName(CHAIN_NAME)
    .build();
}

export interface SwapCsprForTokensParams {
  fromPublicKeyHex: string;
  /** Swap route as contract-package hashes; MUST start with WCSPR. */
  path: string[];
  amountCspr: number;
  /** Minimum acceptable output in the target token's base units. */
  amountOutMin: string;
  deadlineMs?: number;
  paymentCspr?: number;
}

/** Build swap_exact_cspr_for_tokens (CSPR -> token) via the proxy caller. */
export function buildSwapCsprForTokens(p: SwapCsprForTokensParams): Transaction {
  if (p.path.length < 2) throw new Error("swap path needs >= 2 hops");
  if (p.path[0] !== CSPR_TRADE.wcsprPackageHash) {
    throw new Error("swap path must start with WCSPR");
  }
  const deadline = Date.now() + (p.deadlineMs ?? DEFAULT_DEADLINE_MS);
  const inner = Args.fromMap({
    amount_out_min: CLValue.newCLUInt256(p.amountOutMin),
    path: CLValue.newCLList(
      CLTypeKey,
      p.path.map((h) => hashKey(h))
    ),
    to: accountKey(p.fromPublicKeyHex),
    deadline: CLValue.newCLUint64(deadline),
  });
  return buildProxyRouterTx(
    p.fromPublicKeyHex,
    "swap_exact_cspr_for_tokens",
    inner,
    csprToMotes(p.amountCspr),
    p.paymentCspr ?? DEFAULT_ROUTER_PAYMENT_CSPR
  );
}

export interface AddLiquidityCsprParams {
  fromPublicKeyHex: string;
  /** Contract package hash of the non-CSPR token in the pool. */
  tokenPackageHash: string;
  /** Desired token amount (base units). */
  amountTokenDesired: string;
  /** Minimum token accepted (slippage floor, base units). */
  amountTokenMin: string;
  /** Desired CSPR to pair (attached to the tx). */
  amountCsprDesired: number;
  /** Minimum CSPR accepted (slippage floor, CSPR). */
  amountCsprMin: number;
  deadlineMs?: number;
  paymentCspr?: number;
}

/** Build add_liquidity_cspr (deposit CSPR + token, mint LP) via proxy caller. */
export function buildAddLiquidityCspr(p: AddLiquidityCsprParams): Transaction {
  const deadline = Date.now() + (p.deadlineMs ?? DEFAULT_DEADLINE_MS);
  const inner = Args.fromMap({
    token: hashKey(p.tokenPackageHash),
    amount_token_desired: CLValue.newCLUInt256(p.amountTokenDesired),
    amount_token_min: CLValue.newCLUInt256(p.amountTokenMin),
    amount_cspr_min: CLValue.newCLUInt256(csprToMotes(p.amountCsprMin)),
    to: accountKey(p.fromPublicKeyHex),
    deadline: CLValue.newCLUint64(deadline),
  });
  return buildProxyRouterTx(
    p.fromPublicKeyHex,
    "add_liquidity_cspr",
    inner,
    csprToMotes(p.amountCsprDesired),
    p.paymentCspr ?? DEFAULT_ROUTER_PAYMENT_CSPR
  );
}

export interface RemoveLiquidityCsprParams {
  fromPublicKeyHex: string;
  /** Contract package hash of the non-CSPR token in the pool. */
  tokenPackageHash: string;
  /** LP (pair) tokens to burn, in base units. */
  liquidity: string;
  /** Minimum token accepted out (slippage floor, base units). */
  amountTokenMin: string;
  /** Minimum CSPR accepted out (slippage floor, CSPR). */
  amountCsprMin: number;
  deadlineMs?: number;
  paymentCspr?: number;
}

/**
 * Build remove_liquidity_cspr (burn LP, receive token + native CSPR).
 *
 * Unlike deposits/swaps, exiting attaches NO CSPR — value flows OUT to `to`.
 * So this is a DIRECT router call (normal named args), not a proxy_caller
 * session: the proxy exists only to fund a purse for CSPR-in entry points, and
 * routing an exit through it would pass a purse the router's exit path doesn't
 * expect. The caller must first `approve` the router on the pair (LP) token.
 */
export function buildRemoveLiquidityCspr(p: RemoveLiquidityCsprParams): Transaction {
  const deadline = Date.now() + (p.deadlineMs ?? DEFAULT_DEADLINE_MS);
  const args = Args.fromMap({
    token: hashKey(p.tokenPackageHash),
    liquidity: CLValue.newCLUInt256(p.liquidity),
    amount_token_min: CLValue.newCLUInt256(p.amountTokenMin),
    amount_cspr_min: CLValue.newCLUInt256(csprToMotes(p.amountCsprMin)),
    to: accountKey(p.fromPublicKeyHex),
    deadline: CLValue.newCLUint64(deadline),
  });
  return new ContractCallBuilder()
    .from(PublicKey.fromHex(p.fromPublicKeyHex))
    .byPackageHash(CSPR_TRADE.routerPackageHash)
    .entryPoint("remove_liquidity_cspr")
    .runtimeArgs(args)
    .payment(csprToMotesNumber(p.paymentCspr ?? DEFAULT_ROUTER_PAYMENT_CSPR))
    .chainName(CHAIN_NAME)
    .build();
}

export interface ApproveParams {
  fromPublicKeyHex: string;
  /** CEP-18 token contract package hash to approve spending on. */
  tokenPackageHash: string;
  /** Amount to approve (base units). Defaults to a large allowance. */
  amount: string;
  /** Spender package hash. Defaults to the CSPR.trade router. */
  spenderPackageHash?: string;
  paymentCspr?: number;
}

/** Build a CEP-18 approve granting the router an allowance on `token`. */
export function buildApproveToken(p: ApproveParams): Transaction {
  const spender = p.spenderPackageHash ?? CSPR_TRADE.routerPackageHash;
  const args = Args.fromMap({
    spender: hashKey(spender),
    amount: CLValue.newCLUInt256(p.amount),
  });
  return new ContractCallBuilder()
    .from(PublicKey.fromHex(p.fromPublicKeyHex))
    .byPackageHash(p.tokenPackageHash)
    .entryPoint("approve")
    .runtimeArgs(args)
    .payment(csprToMotesNumber(p.paymentCspr ?? DEFAULT_APPROVE_PAYMENT_CSPR))
    .chainName(CHAIN_NAME)
    .build();
}

/**
 * Uniswap-V2 constant-product quote from raw reserves (base units).
 * out = (in * 997 * reserveOut) / (reserveIn * 1000 + in * 997)
 */
export function quoteAmountOut(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint
): bigint {
  if (amountIn <= 0n || reserveIn <= 0n || reserveOut <= 0n) return 0n;
  const amountInWithFee = amountIn * 997n;
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * 1000n + amountInWithFee;
  return numerator / denominator;
}

/**
 * Given a CSPR amount and pool reserves, compute the matching token amount to
 * keep the pool ratio (used to size add_liquidity_cspr).
 * amountToken = amountCspr * reserveToken / reserveCspr
 */
export function quoteLiquidityPair(
  amountCsprMotes: bigint,
  reserveCsprMotes: bigint,
  reserveTokenBase: bigint
): bigint {
  if (reserveCsprMotes <= 0n) return 0n;
  return (amountCsprMotes * reserveTokenBase) / reserveCsprMotes;
}

/** Apply a slippage tolerance (bps) to a minimum-out figure. */
export function applySlippage(amount: bigint, slippageBps: number): bigint {
  const bps = BigInt(Math.max(0, Math.min(10_000, Math.round(slippageBps))));
  return (amount * (10_000n - bps)) / 10_000n;
}

/**
 * Price impact of a swap in basis points, from constant-product reserves.
 * Impact ≈ amountIn / (reserveIn + amountIn): the fraction of the pool the
 * trade consumes, which is what moves the marginal price.
 */
export function priceImpactBps(amountIn: bigint, reserveIn: bigint): number {
  if (amountIn <= 0n || reserveIn <= 0n) return 0;
  return Number((amountIn * 10_000n) / (reserveIn + amountIn));
}

/**
 * Pro-rata output of burning `liquidity` LP tokens (Uniswap-V2 exit):
 *   amountX = liquidity * reserveX / totalSupply
 * Returns both the CSPR (motes) and paired-token (base units) legs.
 */
export function quoteRemoveLiquidity(
  liquidity: bigint,
  reserveCsprMotes: bigint,
  reserveTokenBase: bigint,
  totalSupply: bigint
): { csprMotes: bigint; tokenBase: bigint } {
  if (liquidity <= 0n || totalSupply <= 0n) {
    return { csprMotes: 0n, tokenBase: 0n };
  }
  return {
    csprMotes: (liquidity * reserveCsprMotes) / totalSupply,
    tokenBase: (liquidity * reserveTokenBase) / totalSupply,
  };
}
