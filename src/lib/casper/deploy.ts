/**
 * Casper transaction layer (server-side).
 *
 * Builds native auction transactions for staking rebalances (redelegate =
 * move stake from validator A to B in one tx), signs them with the session key
 * for the auto path, or serializes them unsigned for Casper Wallet on the
 * human-approval path, and submits via the CSPR.cloud node RPC.
 */

import {
  PublicKey,
  PrivateKey,
  NativeRedelegateBuilder,
  NativeDelegateBuilder,
  NativeUndelegateBuilder,
  HttpHandler,
  RpcClient,
  Transaction,
} from "casper-js-sdk";
import { CSPR_CLOUD, CASPER_NETWORK, getCsprCloudApiKey } from "./config";
import { MOTES_PER_CSPR } from "./normalize";

export const CHAIN_NAME = CASPER_NETWORK === "mainnet" ? "casper" : "casper-test";

/** Default gas payment for native auction entry points (CSPR). */
const DEFAULT_PAYMENT_CSPR = 5;

export function csprToMotes(cspr: number): string {
  return BigInt(Math.round(cspr * MOTES_PER_CSPR)).toString();
}

/** Payment/gas amounts must be numbers for the SDK serializer. */
export function csprToMotesNumber(cspr: number): number {
  return Math.round(cspr * MOTES_PER_CSPR);
}

let rpc: RpcClient | null = null;

function getRpcClient(): RpcClient {
  if (rpc) return rpc;
  const handler = new HttpHandler(CSPR_CLOUD.nodeRpcUrl);
  // CSPR.cloud node RPC requires the access token.
  handler.setCustomHeaders({ Authorization: getCsprCloudApiKey() });
  rpc = new RpcClient(handler);
  return rpc;
}

export interface RedelegateParams {
  fromPublicKeyHex: string;
  oldValidatorHex: string;
  newValidatorHex: string;
  amountCspr: number;
  paymentCspr?: number;
}

/** Build an unsigned redelegate transaction (move stake A -> B). */
export function buildRedelegateTransaction(p: RedelegateParams): Transaction {
  const payment = csprToMotesNumber(p.paymentCspr ?? DEFAULT_PAYMENT_CSPR);
  return new NativeRedelegateBuilder()
    .from(PublicKey.fromHex(p.fromPublicKeyHex))
    .validator(PublicKey.fromHex(p.oldValidatorHex))
    .newValidator(PublicKey.fromHex(p.newValidatorHex))
    .amount(csprToMotes(p.amountCspr))
    .chainName(CHAIN_NAME)
    .payment(payment)
    .build();
}

export interface DelegateParams {
  fromPublicKeyHex: string;
  validatorHex: string;
  amountCspr: number;
  paymentCspr?: number;
}

/** Build an unsigned delegate transaction (idle CSPR -> validator). */
export function buildDelegateTransaction(p: DelegateParams): Transaction {
  const payment = csprToMotesNumber(p.paymentCspr ?? DEFAULT_PAYMENT_CSPR);
  return new NativeDelegateBuilder()
    .from(PublicKey.fromHex(p.fromPublicKeyHex))
    .validator(PublicKey.fromHex(p.validatorHex))
    .amount(csprToMotes(p.amountCspr))
    .chainName(CHAIN_NAME)
    .payment(payment)
    .build();
}

/** Build an unsigned undelegate transaction (validator -> idle CSPR). */
export function buildUndelegateTransaction(p: DelegateParams): Transaction {
  const payment = csprToMotesNumber(p.paymentCspr ?? DEFAULT_PAYMENT_CSPR);
  return new NativeUndelegateBuilder()
    .from(PublicKey.fromHex(p.fromPublicKeyHex))
    .validator(PublicKey.fromHex(p.validatorHex))
    .amount(csprToMotes(p.amountCspr))
    .chainName(CHAIN_NAME)
    .payment(payment)
    .build();
}

/** Serialize an unsigned transaction for Casper Wallet to sign in the browser. */
export function serializeTransaction(tx: Transaction): unknown {
  return tx.toJSON();
}

export interface SubmitResult {
  transactionHash: string;
}

/** Sign a transaction with the session key and submit it. */
export async function signAndSubmit(
  tx: Transaction,
  key: PrivateKey
): Promise<SubmitResult> {
  await tx.sign(key);
  return submitSigned(tx);
}

/** Submit a wallet-signed transaction provided as JSON from the browser. */
export async function submitSignedFromJson(json: unknown): Promise<SubmitResult> {
  const tx = Transaction.fromJSON(json);
  return submitSigned(tx);
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  return new Uint8Array(Buffer.from(clean, "hex"));
}

/**
 * Attach a Casper Wallet signature to an unsigned transaction and submit it.
 * The wallet returns a signature hex; we reattach it to the rebuilt tx.
 */
export async function submitWithSignature(
  unsignedJson: unknown,
  signatureHex: string,
  publicKeyHex: string
): Promise<SubmitResult> {
  const tx = Transaction.fromJSON(unsignedJson);
  tx.setSignature(hexToBytes(signatureHex), PublicKey.fromHex(publicKeyHex));
  return submitSigned(tx);
}

/** Submit an already-signed transaction. */
export async function submitSigned(tx: Transaction): Promise<SubmitResult> {
  const client = getRpcClient();
  const res = await client.putTransaction(tx);
  // The SDK returns a transaction hash object; normalize to hex.
  const hash =
    // @ts-expect-error - SDK response shape varies across builds
    res?.transactionHash?.toHex?.() ??
    // @ts-expect-error - fallback field
    res?.transactionHash ??
    // @ts-expect-error - deploy-style fallback
    res?.deployHash ??
    "";
  return { transactionHash: String(hash) };
}
