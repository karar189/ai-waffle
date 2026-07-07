import { NextRequest, NextResponse } from "next/server";
import { findLpSnapshot, planLpWithdraw } from "@/lib/agent/lp";
import { getSessionPublicKeyHex } from "@/lib/casper/keys";

export const dynamic = "force-dynamic";

/**
 * POST /api/agent/lp/withdraw/quote
 * Preview an LP exit (no on-chain writes): LP tokens burned, pool share, and the
 * expected token + CSPR out with slippage floors — quoted against fresh on-chain
 * reserves and the pair's total supply.
 * Body: { venueId, percent?: 1-100, liquidity?: string, slippageBps? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      venueId?: string;
      percent?: number;
      liquidity?: string;
      slippageBps?: number;
    };
    if (!body.venueId) {
      return NextResponse.json({ error: "venueId is required." }, { status: 400 });
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
    const plan = await planLpWithdraw({
      account,
      lp: snapshot.lp,
      venueId: snapshot.id,
      percent: body.percent,
      liquidity: body.liquidity,
      slippageBps: body.slippageBps ?? 100,
    });
    return NextResponse.json({
      venueId: snapshot.id,
      protocol: snapshot.protocol,
      pool: snapshot.lp,
      plan,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "lp withdraw quote failed" },
      { status: 500 }
    );
  }
}
