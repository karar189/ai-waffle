import { NextRequest, NextResponse } from "next/server";
import { findLpSnapshot, executeLpWithdraw } from "@/lib/agent/lp";
import { getSessionPublicKeyHex } from "@/lib/casper/keys";
import { getState } from "@/lib/agent/store";

export const dynamic = "force-dynamic";
// The saga signs + confirms two sequential transactions on-chain.
export const maxDuration = 300;

/**
 * POST /api/agent/lp/withdraw/execute
 * Runs the LP exit saga (approve → remove_liquidity_cspr) with the session key.
 * Guardrails: agent must not be paused / emergency-stopped and a session key
 * must be configured.
 * Body: { venueId, percent?: 1-100, liquidity?: string, slippageBps?, decisionId? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      venueId?: string;
      percent?: number;
      liquidity?: string;
      slippageBps?: number;
      decisionId?: string;
    };
    if (!body.venueId) {
      return NextResponse.json({ error: "venueId is required." }, { status: 400 });
    }

    const state = await getState();
    if (state.policy.emergencyStop) {
      return NextResponse.json({ error: "Emergency stop is active." }, { status: 409 });
    }
    if (state.policy.paused) {
      return NextResponse.json({ error: "Agent is paused." }, { status: 409 });
    }

    const account = await getSessionPublicKeyHex();
    if (!account) {
      return NextResponse.json(
        { error: "No session key configured; LP exit needs auto-sign." },
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

    const result = await executeLpWithdraw({
      account,
      lp: snapshot.lp,
      protocol: snapshot.protocol,
      venueId: snapshot.id,
      percent: body.percent,
      liquidity: body.liquidity,
      slippageBps: body.slippageBps ?? 100,
      decisionId: body.decisionId,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "lp withdraw execute failed" },
      { status: 500 }
    );
  }
}
