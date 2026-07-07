import { NextRequest, NextResponse } from "next/server";
import { findLpSnapshot, planLpDepositLive } from "@/lib/agent/lp";

export const dynamic = "force-dynamic";

/**
 * POST /api/agent/lp/quote
 * Preview an LP deposit (no on-chain writes): swap/liquidity split, expected
 * token out, slippage floors, price impact and estimated gas, quoted against
 * FRESH on-chain reserves (the router's get_amounts_out math).
 * Body: { venueId: string, amountCspr: number, slippageBps?: number }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      venueId?: string;
      amountCspr?: number;
      slippageBps?: number;
    };
    if (!body.venueId || !body.amountCspr || body.amountCspr <= 0) {
      return NextResponse.json(
        { error: "venueId and a positive amountCspr are required." },
        { status: 400 }
      );
    }
    const snapshot = await findLpSnapshot(body.venueId);
    if (!snapshot?.lp) {
      return NextResponse.json(
        { error: `LP venue ${body.venueId} not found or not CSPR-executable.` },
        { status: 404 }
      );
    }
    const plan = await planLpDepositLive(
      snapshot.lp,
      body.amountCspr,
      body.slippageBps ?? 100
    );
    return NextResponse.json({
      venueId: snapshot.id,
      protocol: snapshot.protocol,
      apy: snapshot.apy,
      pool: snapshot.lp,
      plan,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "lp quote failed" },
      { status: 500 }
    );
  }
}
