import { NextResponse } from "next/server";
import { getHeldLpPositions } from "@/lib/agent/lp";
import { getSessionPublicKeyHex } from "@/lib/casper/keys";

export const dynamic = "force-dynamic";

/**
 * GET /api/agent/lp/positions
 * LP positions the session account currently holds (pair-token balance > 0),
 * with a rough CSPR value and the pool's APY — the set the agent can exit.
 */
export async function GET() {
  try {
    const account = await getSessionPublicKeyHex();
    if (!account) {
      return NextResponse.json({ account: null, positions: [] });
    }
    const positions = await getHeldLpPositions(account);
    return NextResponse.json({ account, count: positions.length, positions });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "lp positions failed" },
      { status: 500 }
    );
  }
}
