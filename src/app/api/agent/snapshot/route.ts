import { NextRequest, NextResponse } from "next/server";
import { getYieldSnapshots } from "@/lib/casper/snapshots";
import { rankVenues } from "@/lib/rebalance/rank";
import { DEFAULT_POLICY } from "@/lib/rebalance/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/agent/snapshot
 * Returns the live, normalized yield snapshots across Casper venues plus a
 * risk-adjusted ranking under the default policy. This is the read half of the
 * agent's monitor step and backs the dashboard "best available yield".
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeLp = searchParams.get("lp") === "true";
    const maxValidators = Number(searchParams.get("validators") ?? 8);
    const stakingRefAccount = searchParams.get("ref") ?? undefined;

    const result = await getYieldSnapshots({
      maxValidators,
      includeLp,
      stakingRefAccount,
    });
    const ranked = rankVenues(result.snapshots, DEFAULT_POLICY);

    return NextResponse.json({
      meta: result.meta,
      count: result.snapshots.length,
      ranked: ranked.map((r) => ({
        rank: r.rank,
        id: r.snapshot.id,
        kind: r.snapshot.kind,
        protocol: r.snapshot.protocol,
        apy: r.snapshot.apy,
        apySource: r.snapshot.apySource,
        riskScore: r.snapshot.riskScore,
        riskAdjustedApy: r.riskAdjustedApy,
        tvl: r.snapshot.tvl,
        riskFlags: r.snapshot.riskFlags,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "snapshot failed" },
      { status: 500 }
    );
  }
}
