import { NextRequest, NextResponse } from "next/server";
import { runAgentCycle } from "@/lib/agent/orchestrator";

export const dynamic = "force-dynamic";

/**
 * POST /api/agent/monitor
 * Runs one monitor -> decide cycle. When { autoExecute: true } and the proposal
 * is auto-signable and the agent is running, it also executes (auto path only).
 * Body: { mode?: "dry_run" | "live", autoExecute?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      mode?: "dry_run" | "live";
      autoExecute?: boolean;
    };
    const result = await runAgentCycle({
      mode: body.mode ?? "dry_run",
      autoExecute: body.autoExecute,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "monitor failed" },
      { status: 500 }
    );
  }
}
