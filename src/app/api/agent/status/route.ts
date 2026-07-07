import { NextResponse } from "next/server";
import { getState } from "@/lib/agent/store";
import { isAutoSignEnabled, getSessionPublicKeyHex } from "@/lib/casper/keys";

export const dynamic = "force-dynamic";

/** GET /api/agent/status - full agent state for the dashboard. */
export async function GET() {
  const state = await getState();
  return NextResponse.json({
    running: state.running,
    policy: state.policy,
    positions: state.positions,
    connectedAccount: state.connectedAccount ?? null,
    autoSignEnabled: await isAutoSignEnabled(),
    sessionPublicKey: await getSessionPublicKeyHex(),
    lastMoveAt: state.lastMoveAt,
    decisions: state.decisions.slice(0, 20),
    executions: state.executions.slice(0, 20),
  });
}
