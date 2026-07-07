import { createHash } from "crypto";
import {
  Args,
  CLValue,
  ContractCallBuilder,
  PublicKey,
  Transaction,
} from "casper-js-sdk";
import { WAFFLE_AGENT_POLICY } from "./config";
import { CHAIN_NAME, csprToMotes, csprToMotesNumber } from "./deploy";
import type { PolicyConfig, RebalanceProposal } from "@/lib/rebalance/types";

const POLICY_PAYMENT_CSPR = 5;
const INTENT_PAYMENT_CSPR = 5;

export function isAgentPolicyConfigured(): boolean {
  return /^[0-9a-fA-F]{64}$/.test(WAFFLE_AGENT_POLICY.packageHash);
}

export function agentPolicyPackageHash(): string | null {
  return isAgentPolicyConfigured() ? WAFFLE_AGENT_POLICY.packageHash : null;
}

function requirePackageHash(): string {
  if (!isAgentPolicyConfigured()) {
    throw new Error(
      "WAFFLE_AGENT_POLICY_PACKAGE_HASH is not set. Deploy the policy contract first."
    );
  }
  return WAFFLE_AGENT_POLICY.packageHash;
}

function policyArgs(agentKey: string, policy: PolicyConfig): Args {
  return Args.fromMap({
    agent_key: CLValue.newCLString(agentKey),
    max_move_motes: CLValue.newCLUInt512(csprToMotes(policy.maxMoveSizeCspr)),
    risk_level: CLValue.newCLUint8(Math.round(policy.riskAversion * 100)),
    allowed_actions: CLValue.newCLString(
      policy.allowedKinds.length ? policy.allowedKinds.join(",") : "staking,lp,dex"
    ),
    allowed_protocols: CLValue.newCLString("casper_auction,cspr_trade"),
  });
}

function callPolicy(
  fromPublicKeyHex: string,
  entryPoint: string,
  runtimeArgs: Args,
  paymentCspr = POLICY_PAYMENT_CSPR
): Transaction {
  return new ContractCallBuilder()
    .from(PublicKey.fromHex(fromPublicKeyHex))
    .byPackageHash(requirePackageHash())
    .entryPoint(entryPoint)
    .runtimeArgs(runtimeArgs)
    .payment(csprToMotesNumber(paymentCspr))
    .chainName(CHAIN_NAME)
    .build();
}

export function buildRegisterPolicyTransaction(params: {
  fromPublicKeyHex: string;
  agentKey: string;
  policy: PolicyConfig;
}): Transaction {
  return callPolicy(
    params.fromPublicKeyHex,
    "register_policy",
    policyArgs(params.agentKey, params.policy)
  );
}

export function buildUpdatePolicyTransaction(params: {
  fromPublicKeyHex: string;
  agentKey: string;
  policy: PolicyConfig;
}): Transaction {
  return callPolicy(
    params.fromPublicKeyHex,
    "update_policy",
    policyArgs(params.agentKey, params.policy)
  );
}

export function buildPausePolicyTransaction(fromPublicKeyHex: string): Transaction {
  return callPolicy(fromPublicKeyHex, "pause_policy", Args.fromMap({}));
}

export function buildResumePolicyTransaction(fromPublicKeyHex: string): Transaction {
  return callPolicy(fromPublicKeyHex, "resume_policy", Args.fromMap({}));
}

export function buildRevokePolicyTransaction(fromPublicKeyHex: string): Transaction {
  return callPolicy(fromPublicKeyHex, "revoke_policy", Args.fromMap({}));
}

export function proposalAction(proposal: RebalanceProposal): string {
  if (proposal.fromVenueId.startsWith("lp:")) return "lp_exit";
  if (proposal.toVenueId.startsWith("lp:")) return "lp_enter";
  if (proposal.fromVenueId === "idle") return "stake";
  return "redelegate";
}

export function intentHash(params: {
  decisionId: string;
  account: string;
  proposal: RebalanceProposal;
}): string {
  const body = JSON.stringify({
    decisionId: params.decisionId,
    account: params.account,
    fromVenueId: params.proposal.fromVenueId,
    toVenueId: params.proposal.toVenueId,
    amountCspr: params.proposal.amountCspr,
    expectedAnnualGainCspr: params.proposal.expectedAnnualGainCspr,
  });
  return createHash("sha256").update(body).digest("hex");
}

export function buildRecordIntentTransaction(params: {
  fromPublicKeyHex: string;
  decisionId: string;
  proposal: RebalanceProposal;
}): Transaction {
  const action = proposalAction(params.proposal);
  const hash = intentHash({
    decisionId: params.decisionId,
    account: params.fromPublicKeyHex,
    proposal: params.proposal,
  });
  return callPolicy(
    params.fromPublicKeyHex,
    "record_intent",
    Args.fromMap({
      intent_hash: CLValue.newCLString(hash),
      action: CLValue.newCLString(action),
      amount_motes: CLValue.newCLUInt512(csprToMotes(params.proposal.amountCspr)),
      venue: CLValue.newCLString(params.proposal.toVenueId),
    }),
    INTENT_PAYMENT_CSPR
  );
}
