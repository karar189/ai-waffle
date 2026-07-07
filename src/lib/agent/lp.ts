/**
 * LP execution saga (CSPR.trade router).
 *
 * Entering a CSPR-paired LP position from idle CSPR is a multi-transaction
 * operation, so it can't ride the single-tx auto path used for staking:
 *
 *   1. swap   — half the CSPR is swapped to the paired token (WCSPR → token)
 *   2. approve — grant the router an allowance on the received token
 *   3. add_liquidity_cspr — deposit the token + the remaining CSPR, mint LP
 *
 * Each step is signed with the session key and confirmed on-chain before the
 * next one runs (steps 2 and 3 depend on the swap output). Progress is written
 * to the execution record after every step so the dashboard can show the saga
 * live and so a crash mid-saga is auditable.
 *
 * Human-approval signing isn't offered for LP because it would require three
 * separate wallet signatures with on-chain waits between them; LP execution is
 * therefore session-key only and gated behind an explicit request.
 *
 * Exiting a position (executeLpWithdraw) is the reverse two-step saga:
 *   1. approve the router on the pair (LP) token
 *   2. remove_liquidity_cspr — burn LP, receive token + native CSPR
 * Both entry and exit quote against fresh on-chain reserves (planLp*Live /
 * planLpWithdraw) rather than snapshot-time reserves, for exact pricing.
 */

import {
  buildSwapCsprForTokens,
  buildApproveToken,
  buildAddLiquidityCspr,
  buildRemoveLiquidityCspr,
  quoteAmountOut,
  quoteRemoveLiquidity,
  priceImpactBps,
  applySlippage,
} from "@/lib/casper/dex";
import { CSPR_TRADE } from "@/lib/casper/config";
import { signAndSubmit } from "@/lib/casper/deploy";
import { getDeploy, getFungibleTokenOwnership } from "@/lib/casper/csprcloud";
import { readLivePairReserves, readPairTotalSupply } from "@/lib/casper/reserves";
import { getSessionKey } from "@/lib/casper/keys";
import { getYieldSnapshots } from "@/lib/casper/snapshots";
import {
  MOTES_PER_CSPR,
  type LpPoolInfo,
  type YieldSnapshot,
} from "@/lib/casper/normalize";
import {
  getState,
  addExecution,
  updateExecution,
  markMoveExecuted,
  newId,
  type ExecutionRecord,
  type ExecutionStep,
} from "./store";

/** Gas limits (CSPR) per step; router calls are heavier than a plain approve. */
const GAS = { swap: 25, approve: 5, addLiquidity: 30 } as const;

export interface LpDepositPlan {
  amountCspr: number;
  /** CSPR swapped to the paired token (≈ half). */
  swapCspr: number;
  /** CSPR kept for the LP CSPR side (≈ half). */
  liquidityCspr: number;
  slippageBps: number;
  tokenSymbol: string;
  /** Expected token out from the swap (base units). */
  expectedTokenOut: string;
  /** Minimum token out accepted on the swap (base units). */
  swapMinOut: string;
  estGasCspr: number;
  /** Where the reserves used for this quote came from. */
  reserveSource: "live_onchain" | "snapshot";
  /** Estimated price impact of the swap leg, in basis points. */
  priceImpactBps: number;
}

/** Find a live, executable (CSPR-paired) LP venue snapshot by id. */
export async function findLpSnapshot(
  venueId: string
): Promise<YieldSnapshot | null> {
  const { snapshots } = await getYieldSnapshots({
    maxValidators: 2,
    includeLp: true,
  });
  return snapshots.find((s) => s.id === venueId && s.lp) ?? null;
}

/**
 * Compute a deposit plan from pool reserves (no on-chain writes). Pure: quotes
 * against the reserves carried on `lp`. Use `planLpDepositLive` to first refresh
 * those reserves from chain for exact pricing.
 */
export function planLpDeposit(
  lp: LpPoolInfo,
  amountCspr: number,
  slippageBps = 100,
  reserveSource: LpDepositPlan["reserveSource"] = "snapshot"
): LpDepositPlan {
  const swapCspr = Math.floor((amountCspr / 2) * 1e4) / 1e4;
  const liquidityCspr = amountCspr - swapCspr;
  const swapMotes = BigInt(Math.round(swapCspr * MOTES_PER_CSPR));
  const reserveCspr = BigInt(lp.reserveCsprMotes);
  const reserveToken = BigInt(lp.reserveTokenBase);
  const expectedOut = quoteAmountOut(swapMotes, reserveCspr, reserveToken);
  const minOut = applySlippage(expectedOut, slippageBps);
  return {
    amountCspr,
    swapCspr,
    liquidityCspr,
    slippageBps,
    tokenSymbol: lp.tokenSymbol,
    expectedTokenOut: expectedOut.toString(),
    swapMinOut: minOut.toString(),
    estGasCspr: GAS.swap + GAS.approve + GAS.addLiquidity,
    reserveSource,
    priceImpactBps: priceImpactBps(swapMotes, reserveCspr),
  };
}

/**
 * Deposit plan quoted against FRESH on-chain reserves (the router's
 * get_amounts_out math applied to reserves read at quote time). Falls back to
 * the snapshot reserves if the live read fails.
 */
export async function planLpDepositLive(
  lp: LpPoolInfo,
  amountCspr: number,
  slippageBps = 100
): Promise<LpDepositPlan> {
  const fresh = await readLivePairReserves(lp).catch(() => null);
  const lpFresh: LpPoolInfo = fresh ? { ...lp, ...fresh } : lp;
  return planLpDeposit(
    lpFresh,
    amountCspr,
    slippageBps,
    fresh ? "live_onchain" : "snapshot"
  );
}

/** Poll a deploy until it lands in a block; resolves confirmed/failed. */
async function waitForDeploy(
  hash: string,
  timeoutMs = 180_000,
  intervalMs = 6_000
): Promise<{ confirmed: boolean; error?: string }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const d = await getDeploy(hash);
      // A processed deploy carries a block hash; error_message flags failure.
      if (d.block_hash) {
        return d.error_message
          ? { confirmed: false, error: d.error_message }
          : { confirmed: true };
      }
    } catch {
      // Not indexed yet — keep polling.
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return { confirmed: false, error: "confirmation timed out" };
}

/** Read an account's balance of a token (base units) via CSPR.cloud. */
async function tokenBalance(account: string, tokenPkgHash: string): Promise<bigint> {
  try {
    const res = await getFungibleTokenOwnership(account, { pageSize: 250 });
    const row = res.data.find(
      (r) => r.contract_package_hash === tokenPkgHash
    );
    return row ? BigInt(row.balance) : 0n;
  } catch {
    return 0n;
  }
}

export interface LpExecuteResult {
  execution: ExecutionRecord;
}

/**
 * Run the full LP deposit saga with the session key. `account` must be the
 * session key's public key (the signer that holds the funds).
 */
export async function executeLpDeposit(params: {
  account: string;
  lp: LpPoolInfo;
  protocol: string;
  venueId: string;
  amountCspr: number;
  slippageBps?: number;
  decisionId?: string;
  expectedAnnualGainCspr?: number;
}): Promise<LpExecuteResult> {
  const {
    account,
    lp,
    amountCspr,
    slippageBps = 100,
    decisionId = "manual",
  } = params;

  const sessionKey = await getSessionKey();
  if (!sessionKey) {
    throw new Error(
      "LP execution requires a server-side session key (auto-sign). Configure CASPER_SESSION_PRIVATE_KEY_HEX."
    );
  }
  if ((await sessionKey.publicKey.toHex()) !== account) {
    throw new Error(
      "LP execution currently runs with the session key only; connect the session account or fund it."
    );
  }

  const plan = await planLpDepositLive(lp, amountCspr, slippageBps);
  const state = await getState();

  const steps: ExecutionStep[] = [
    { label: `Swap ${plan.swapCspr} CSPR → ${lp.tokenSymbol}`, entryPoint: "swap_exact_cspr_for_tokens", status: "prepared" },
    { label: `Approve router for ${lp.tokenSymbol}`, entryPoint: "approve", status: "prepared" },
    { label: `Add liquidity (${plan.liquidityCspr} CSPR + ${lp.tokenSymbol})`, entryPoint: "add_liquidity_cspr", status: "prepared" },
  ];

  const exec: ExecutionRecord = {
    id: newId("exec"),
    decisionId,
    createdAt: new Date().toISOString(),
    fromProtocol: "Idle wallet balance",
    toProtocol: params.protocol,
    fromVenueId: "idle",
    toVenueId: params.venueId,
    amountCspr,
    expectedAnnualGainCspr: params.expectedAnnualGainCspr ?? 0,
    signingPath: "auto",
    status: "submitted",
    kind: "lp",
    steps,
    lpTokenPackageHash: lp.pairPackageHash,
    beforeAllocation: state.positions,
  };
  await addExecution(exec);

  const setStep = async (i: number, patch: Partial<ExecutionStep>) => {
    steps[i] = { ...steps[i], ...patch };
    await updateExecution(exec.id, { steps: [...steps] });
  };
  const fail = async (i: number, error: string) => {
    await setStep(i, { status: "failed", error });
    const updated = await updateExecution(exec.id, { status: "failed", error });
    return { execution: updated ?? { ...exec, status: "failed", error } };
  };

  // Step 1: swap half the CSPR to the paired token.
  const tokenBefore = await tokenBalance(account, lp.tokenPackageHash);
  let swapTx;
  try {
    swapTx = buildSwapCsprForTokens({
      fromPublicKeyHex: account,
      path: [CSPR_TRADE.wcsprPackageHash, lp.tokenPackageHash],
      amountCspr: plan.swapCspr,
      amountOutMin: plan.swapMinOut,
      paymentCspr: GAS.swap,
    });
  } catch (e) {
    return fail(0, e instanceof Error ? e.message : "build swap failed");
  }
  const swapRes = await signAndSubmit(swapTx, sessionKey);
  await setStep(0, { status: "submitted", deployHash: swapRes.transactionHash });
  const swapConf = await waitForDeploy(swapRes.transactionHash);
  if (!swapConf.confirmed) return fail(0, swapConf.error ?? "swap failed");
  await setStep(0, { status: "confirmed" });

  // Determine how many tokens the swap produced.
  let tokenReceived = 0n;
  for (let i = 0; i < 5; i++) {
    const now = await tokenBalance(account, lp.tokenPackageHash);
    tokenReceived = now - tokenBefore;
    if (tokenReceived > 0n) break;
    await new Promise((r) => setTimeout(r, 4000));
  }
  if (tokenReceived <= 0n) return fail(1, "swap produced no token balance delta");

  // Step 2: approve the router to spend the received token.
  let approveTx;
  try {
    approveTx = buildApproveToken({
      fromPublicKeyHex: account,
      tokenPackageHash: lp.tokenPackageHash,
      amount: tokenReceived.toString(),
      paymentCspr: GAS.approve,
    });
  } catch (e) {
    return fail(1, e instanceof Error ? e.message : "build approve failed");
  }
  const approveRes = await signAndSubmit(approveTx, sessionKey);
  await setStep(1, { status: "submitted", deployHash: approveRes.transactionHash });
  const approveConf = await waitForDeploy(approveRes.transactionHash);
  if (!approveConf.confirmed) return fail(1, approveConf.error ?? "approve failed");
  await setStep(1, { status: "confirmed" });

  // Step 3: add liquidity with the token + the remaining CSPR.
  const lpBefore = await tokenBalance(account, lp.pairPackageHash);
  const tokenMin = applySlippage(tokenReceived, slippageBps).toString();
  const csprMin = plan.liquidityCspr * (1 - slippageBps / 10_000);
  let addTx;
  try {
    addTx = buildAddLiquidityCspr({
      fromPublicKeyHex: account,
      tokenPackageHash: lp.tokenPackageHash,
      amountTokenDesired: tokenReceived.toString(),
      amountTokenMin: tokenMin,
      amountCsprDesired: plan.liquidityCspr,
      amountCsprMin: Math.max(csprMin, 0),
      paymentCspr: GAS.addLiquidity,
    });
  } catch (e) {
    return fail(2, e instanceof Error ? e.message : "build add_liquidity failed");
  }
  const addRes = await signAndSubmit(addTx, sessionKey);
  await setStep(2, { status: "submitted", deployHash: addRes.transactionHash });
  const addConf = await waitForDeploy(addRes.transactionHash);
  if (!addConf.confirmed) return fail(2, addConf.error ?? "add_liquidity failed");
  await setStep(2, { status: "confirmed" });

  // Confirm LP tokens landed.
  let lpReceived = 0n;
  for (let i = 0; i < 5; i++) {
    const now = await tokenBalance(account, lp.pairPackageHash);
    lpReceived = now - lpBefore;
    if (lpReceived > 0n) break;
    await new Promise((r) => setTimeout(r, 4000));
  }

  await markMoveExecuted();
  const finalRec = await updateExecution(exec.id, {
    status: "confirmed",
    deployHash: addRes.transactionHash,
    lpTokensReceived: lpReceived.toString(),
  });
  return { execution: finalRec ?? { ...exec, status: "confirmed" } };
}

// ---------------------------------------------------------------------------
// LP EXIT — burn LP tokens and withdraw token + native CSPR
// ---------------------------------------------------------------------------

/** An LP position the account currently holds (a pair token balance > 0). */
export interface HeldLpPosition {
  venueId: string;
  protocol: string;
  pairPackageHash: string;
  tokenSymbol: string;
  /** LP (pair) tokens held, base units. */
  lpBalance: string;
  /** Rough current value of the position, in CSPR (2 × CSPR-side share). */
  valueCspr: number | null;
  apy: number;
}

export interface LpWithdrawPlan {
  venueId: string;
  tokenSymbol: string;
  /** LP tokens to burn (base units). */
  liquidity: string;
  /** Share of the whole pool this represents, 0..1. */
  poolShare: number;
  slippageBps: number;
  /** Expected CSPR out (whole CSPR). */
  expectedCspr: number;
  /** Minimum CSPR accepted (whole CSPR). */
  minCspr: number;
  /** Expected token out (base units). */
  expectedTokenOut: string;
  /** Minimum token accepted (base units). */
  tokenMinOut: string;
  reserveSource: "live_onchain" | "snapshot";
  estGasCspr: number;
}

/** LP-token balance the account holds for a given pair (base units). */
export async function getLpBalance(
  account: string,
  pairPackageHash: string
): Promise<bigint> {
  return tokenBalance(account, pairPackageHash);
}

/** List the executable LP pools the account actually holds a position in. */
export async function getHeldLpPositions(
  account: string
): Promise<HeldLpPosition[]> {
  const { snapshots } = await getYieldSnapshots({
    maxValidators: 2,
    includeLp: true,
  });
  const pools = snapshots.filter((s) => s.lp);

  // One read of the account's token holdings, then match against known pairs.
  let holdings: { contract_package_hash: string; balance: string }[] = [];
  try {
    const res = await getFungibleTokenOwnership(account, { pageSize: 250 });
    holdings = res.data;
  } catch {
    holdings = [];
  }

  const held: HeldLpPosition[] = [];
  for (const s of pools) {
    const lp = s.lp!;
    const row = holdings.find(
      (h) => h.contract_package_hash === lp.pairPackageHash
    );
    if (!row || BigInt(row.balance) <= 0n) continue;

    let valueCspr: number | null = null;
    try {
      const totalSupply = await readPairTotalSupply(lp.pairPackageHash);
      const fresh = await readLivePairReserves(lp);
      const reserveCsprMotes = BigInt(
        fresh?.reserveCsprMotes ?? lp.reserveCsprMotes
      );
      if (totalSupply > 0n) {
        const share = BigInt(row.balance) * reserveCsprMotes * 2n;
        valueCspr = Number(share / totalSupply) / MOTES_PER_CSPR;
      }
    } catch {
      valueCspr = null;
    }

    held.push({
      venueId: s.id,
      protocol: s.protocol,
      pairPackageHash: lp.pairPackageHash,
      tokenSymbol: lp.tokenSymbol,
      lpBalance: row.balance,
      valueCspr,
      apy: s.apy,
    });
  }
  return held;
}

/**
 * Plan an LP exit: burn `liquidity` LP tokens (or `percent` of the held
 * balance) and receive token + native CSPR pro-rata, quoted against fresh
 * on-chain reserves and the pair's total supply.
 */
export async function planLpWithdraw(params: {
  account: string;
  lp: LpPoolInfo;
  venueId: string;
  liquidity?: string;
  percent?: number;
  slippageBps?: number;
}): Promise<LpWithdrawPlan> {
  const { account, lp, venueId, slippageBps = 100 } = params;

  const balance = await getLpBalance(account, lp.pairPackageHash);
  if (balance <= 0n) {
    throw new Error(`No LP tokens held for ${lp.tokenSymbol} pool.`);
  }
  let liquidity: bigint;
  if (params.liquidity) {
    liquidity = BigInt(params.liquidity);
  } else {
    const pct = Math.max(1, Math.min(100, Math.round(params.percent ?? 100)));
    liquidity = (balance * BigInt(pct)) / 100n;
  }
  if (liquidity <= 0n) throw new Error("Nothing to withdraw.");
  if (liquidity > balance) liquidity = balance;

  const fresh = await readLivePairReserves(lp).catch(() => null);
  const reserveCsprMotes = BigInt(fresh?.reserveCsprMotes ?? lp.reserveCsprMotes);
  const reserveTokenBase = BigInt(fresh?.reserveTokenBase ?? lp.reserveTokenBase);
  const totalSupply = await readPairTotalSupply(lp.pairPackageHash);
  if (totalSupply <= 0n) {
    throw new Error("Could not read LP total supply to price the exit.");
  }

  const out = quoteRemoveLiquidity(
    liquidity,
    reserveCsprMotes,
    reserveTokenBase,
    totalSupply
  );
  const csprMinMotes = applySlippage(out.csprMotes, slippageBps);
  const tokenMin = applySlippage(out.tokenBase, slippageBps);

  return {
    venueId,
    tokenSymbol: lp.tokenSymbol,
    liquidity: liquidity.toString(),
    poolShare: Number((liquidity * 1_000_000n) / totalSupply) / 1_000_000,
    slippageBps,
    expectedCspr: Number(out.csprMotes) / MOTES_PER_CSPR,
    minCspr: Number(csprMinMotes) / MOTES_PER_CSPR,
    expectedTokenOut: out.tokenBase.toString(),
    tokenMinOut: tokenMin.toString(),
    reserveSource: fresh ? "live_onchain" : "snapshot",
    estGasCspr: GAS.approve + GAS.addLiquidity,
  };
}

/**
 * Run the LP exit saga with the session key:
 *   1. approve the router to spend the pair (LP) token
 *   2. remove_liquidity_cspr — burn LP, receive token + native CSPR to `account`
 */
export async function executeLpWithdraw(params: {
  account: string;
  lp: LpPoolInfo;
  protocol: string;
  venueId: string;
  liquidity?: string;
  percent?: number;
  slippageBps?: number;
  decisionId?: string;
}): Promise<LpExecuteResult> {
  const { account, lp, slippageBps = 100, decisionId = "manual" } = params;

  const sessionKey = await getSessionKey();
  if (!sessionKey) {
    throw new Error(
      "LP exit requires a server-side session key (auto-sign). Configure CASPER_SESSION_PRIVATE_KEY_HEX."
    );
  }
  if ((await sessionKey.publicKey.toHex()) !== account) {
    throw new Error(
      "LP exit currently runs with the session key only; connect the session account or fund it."
    );
  }

  const plan = await planLpWithdraw({
    account,
    lp,
    venueId: params.venueId,
    liquidity: params.liquidity,
    percent: params.percent,
    slippageBps,
  });
  const state = await getState();

  const steps: ExecutionStep[] = [
    { label: `Approve router for LP ${lp.tokenSymbol} tokens`, entryPoint: "approve", status: "prepared" },
    { label: `Remove liquidity → ~${plan.expectedCspr.toFixed(2)} CSPR + ${lp.tokenSymbol}`, entryPoint: "remove_liquidity_cspr", status: "prepared" },
  ];

  const exec: ExecutionRecord = {
    id: newId("exec"),
    decisionId,
    createdAt: new Date().toISOString(),
    fromProtocol: params.protocol,
    toProtocol: "Idle wallet balance",
    fromVenueId: params.venueId,
    toVenueId: "idle",
    amountCspr: plan.expectedCspr,
    expectedAnnualGainCspr: 0,
    signingPath: "auto",
    status: "submitted",
    kind: "lp_exit",
    steps,
    lpTokenPackageHash: lp.pairPackageHash,
    beforeAllocation: state.positions,
  };
  await addExecution(exec);

  const setStep = async (i: number, patch: Partial<ExecutionStep>) => {
    steps[i] = { ...steps[i], ...patch };
    await updateExecution(exec.id, { steps: [...steps] });
  };
  const fail = async (i: number, error: string) => {
    await setStep(i, { status: "failed", error });
    const updated = await updateExecution(exec.id, { status: "failed", error });
    return { execution: updated ?? { ...exec, status: "failed", error } };
  };

  // Step 1: approve the router to spend our LP (pair) tokens.
  let approveTx;
  try {
    approveTx = buildApproveToken({
      fromPublicKeyHex: account,
      tokenPackageHash: lp.pairPackageHash,
      amount: plan.liquidity,
      spenderPackageHash: CSPR_TRADE.routerPackageHash,
      paymentCspr: GAS.approve,
    });
  } catch (e) {
    return fail(0, e instanceof Error ? e.message : "build approve failed");
  }
  const approveRes = await signAndSubmit(approveTx, sessionKey);
  await setStep(0, { status: "submitted", deployHash: approveRes.transactionHash });
  const approveConf = await waitForDeploy(approveRes.transactionHash);
  if (!approveConf.confirmed) return fail(0, approveConf.error ?? "approve failed");
  await setStep(0, { status: "confirmed" });

  // Step 2: remove_liquidity_cspr (direct router call, CSPR flows back to us).
  let removeTx;
  try {
    removeTx = buildRemoveLiquidityCspr({
      fromPublicKeyHex: account,
      tokenPackageHash: lp.tokenPackageHash,
      liquidity: plan.liquidity,
      amountTokenMin: plan.tokenMinOut,
      amountCsprMin: Math.max(plan.minCspr, 0),
      paymentCspr: GAS.addLiquidity,
    });
  } catch (e) {
    return fail(1, e instanceof Error ? e.message : "build remove_liquidity failed");
  }
  const removeRes = await signAndSubmit(removeTx, sessionKey);
  await setStep(1, { status: "submitted", deployHash: removeRes.transactionHash });
  const removeConf = await waitForDeploy(removeRes.transactionHash);
  if (!removeConf.confirmed) return fail(1, removeConf.error ?? "remove_liquidity failed");
  await setStep(1, { status: "confirmed" });

  await markMoveExecuted();
  const finalRec = await updateExecution(exec.id, {
    status: "confirmed",
    deployHash: removeRes.transactionHash,
  });
  return { execution: finalRec ?? { ...exec, status: "confirmed" } };
}

/** Find a live executable LP snapshot for a held position (may lack recent swaps). */
export async function findLpSnapshotForExit(
  venueId: string
): Promise<YieldSnapshot | null> {
  return findLpSnapshot(venueId);
}
