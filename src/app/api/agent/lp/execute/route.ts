import { NextRequest, NextResponse } from "next/server";
import { findLpSnapshot, executeLpDeposit } from "@/lib/agent/lp";
import { getSessionPublicKeyHex } from "@/lib/casper/keys";
import { getState } from "@/lib/agent/store";

export const dynamic = "force-dynamic";
// The saga signs + confirms three sequential transactions on-chain.
export const maxDuration = 300;

/**
 * POST /api/agent/lp/execute
 * Runs the LP deposit saga (swap → approve → add_liquidity_cspr) with the
 * session key. Guardrails: agent must not be paused/stopped, LP must be an
 * allowed kind, and a session key must be configured.
 * Body: { venueId: string, amountCspr: number, slippageBps?: number, decisionId?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      venueId?: string;
      amountCspr?: number;
      slippageBps?: number;
      decisionId?: string;
    };
    if (!body.venueId || !body.amountCspr || body.amountCspr <= 0) {
      return NextResponse.json(
        { error: "venueId and a positive amountCspr are required." },
        { status: 400 }
      );
    }

    const state = await getState();
    if (state.policy.emergencyStop) {
      return NextResponse.json({ error: "Emergency stop is active." }, { status: 409 });
    }
    if (state.policy.paused) {
      return NextResponse.json({ error: "Agent is paused." }, { status: 409 });
    }
    if (
      state.policy.allowedKinds.length > 0 &&
      !state.policy.allowedKinds.includes("lp")
    ) {
      return NextResponse.json(
        { error: "LP venues are not in the policy's allowed kinds." },
        { status: 409 }
      );
    }
    if (body.amountCspr > state.policy.maxMoveSizeCspr) {
      return NextResponse.json(
        { error: `Amount exceeds max move size (${state.policy.maxMoveSizeCspr} CSPR).` },
        { status: 409 }
      );
    }

    const account = await getSessionPublicKeyHex();
    if (!account) {
      return NextResponse.json(
        { error: "No session key configured; LP execution needs auto-sign." },
        { status: 409 }
      );
    }

    const snapshot = await findLpSnapshot(body.venueId);
    if (!snapshot?.lp) {
      return NextResponse.json(
        { error: `LP venue ${body.venueId} not found or not CSPR-executable.` },
        { status: 404 }
      );
    }

    const result = await executeLpDeposit({
      account,
      lp: snapshot.lp,
      protocol: snapshot.protocol,
      venueId: snapshot.id,
      amountCspr: body.amountCspr,
      slippageBps: body.slippageBps ?? 100,
      decisionId: body.decisionId,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "lp execute failed" },
      { status: 500 }
    );
  }
}
