import { NextRequest, NextResponse } from "next/server";
import { monitorAndDecide, executeProposal } from "@/lib/agent/orchestrator";
import { getState } from "@/lib/agent/store";

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
    const mode = body.mode ?? "dry_run";

    const { decision, proposal } = await monitorAndDecide(mode);

    let execution = null;
    // The LLM can veto ("hold") an otherwise-valid auto move.
    const llmVetoed = decision.llm?.verdict === "hold";
    if (
      body.autoExecute &&
      proposal &&
      proposal.signingPath === "auto" &&
      mode === "live" &&
      !llmVetoed
    ) {
      const state = await getState();
      if (state.running && !state.policy.paused && !state.policy.emergencyStop) {
        const result = await executeProposal(proposal, decision.id);
        execution = result.execution;
      }
    }

    return NextResponse.json({ decision, proposal, execution, llmVetoed });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "monitor failed" },
      { status: 500 }
    );
  }
}
