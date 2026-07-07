import { NextRequest, NextResponse } from "next/server";
import {
  updatePolicy,
  setRunning,
  setEmergencyStop,
  setPositions,
  setConnectedAccount,
  getState,
} from "@/lib/agent/store";
import { getAccountPositions } from "@/lib/casper/positions";
import type { PolicyConfig, Position } from "@/lib/rebalance/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/agent/policy
 * Update policy and agent controls in one place.
 * Body: {
 *   policy?: Partial<PolicyConfig>,
 *   running?: boolean,
 *   emergencyStop?: boolean,
 *   positions?: Position[],
 *   connectedAccount?: string | null
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      policy?: Partial<PolicyConfig>;
      running?: boolean;
      emergencyStop?: boolean;
      positions?: Position[];
      connectedAccount?: string | null;
    };

    if (body.policy) await updatePolicy(body.policy);
    if (typeof body.emergencyStop === "boolean")
      await setEmergencyStop(body.emergencyStop);
    if (typeof body.running === "boolean") await setRunning(body.running);
    if (body.positions) await setPositions(body.positions);
    if (body.connectedAccount !== undefined) {
      await setConnectedAccount(body.connectedAccount ?? undefined);
      // On connect, read the account's real balance + delegations as positions.
      if (body.connectedAccount) {
        try {
          const real = await getAccountPositions(body.connectedAccount);
          if (real.length) await setPositions(real);
        } catch (err) {
          console.error("[api/agent/policy] failed to read positions:", err);
        }
      }
    }

    const state = await getState();
    return NextResponse.json({
      running: state.running,
      policy: state.policy,
      positions: state.positions,
      connectedAccount: state.connectedAccount ?? null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "policy update failed" },
      { status: 500 }
    );
  }
}
