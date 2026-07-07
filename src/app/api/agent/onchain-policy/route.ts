import { NextRequest, NextResponse } from "next/server";
import { getState } from "@/lib/agent/store";
import {
  agentPolicyPackageHash,
  buildPausePolicyTransaction,
  buildRegisterPolicyTransaction,
  buildResumePolicyTransaction,
  buildRevokePolicyTransaction,
  buildUpdatePolicyTransaction,
  isAgentPolicyConfigured,
} from "@/lib/casper/agent-policy";
import { signAndSubmit } from "@/lib/casper/deploy";
import { getSessionKey, getSessionPublicKeyHex } from "@/lib/casper/keys";

export const dynamic = "force-dynamic";

type Action = "register" | "update" | "pause" | "resume" | "revoke";

export async function GET() {
  return NextResponse.json({
    configured: isAgentPolicyConfigured(),
    packageHash: agentPolicyPackageHash(),
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!isAgentPolicyConfigured()) {
      return NextResponse.json(
        { error: "WAFFLE_AGENT_POLICY_PACKAGE_HASH is not set." },
        { status: 400 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as { action?: Action };
    const action = body.action ?? "register";
    const sessionKey = await getSessionKey();
    const publicKey = await getSessionPublicKeyHex();
    if (!sessionKey || !publicKey) {
      return NextResponse.json(
        { error: "CASPER_SESSION_PRIVATE_KEY_HEX is required." },
        { status: 400 }
      );
    }

    const state = await getState();
    const tx =
      action === "pause"
        ? buildPausePolicyTransaction(publicKey)
        : action === "resume"
          ? buildResumePolicyTransaction(publicKey)
          : action === "revoke"
            ? buildRevokePolicyTransaction(publicKey)
            : action === "update"
              ? buildUpdatePolicyTransaction({
                  fromPublicKeyHex: publicKey,
                  agentKey: publicKey,
                  policy: state.policy,
                })
              : buildRegisterPolicyTransaction({
                  fromPublicKeyHex: publicKey,
                  agentKey: publicKey,
                  policy: state.policy,
                });

    const { transactionHash } = await signAndSubmit(tx, sessionKey);
    return NextResponse.json({
      action,
      transactionHash,
      packageHash: agentPolicyPackageHash(),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "on-chain policy action failed" },
      { status: 500 }
    );
  }
}
