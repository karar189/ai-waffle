import { NextRequest, NextResponse } from "next/server";
import { executeProposal } from "@/lib/agent/orchestrator";
import { getState } from "@/lib/agent/store";
import type { RebalanceProposal } from "@/lib/rebalance/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/agent/execute
 * Executes (or prepares) a rebalance proposal. If no proposal is supplied, the
 * latest decision's proposal is used.
 * Body: { proposal?: RebalanceProposal, decisionId?: string }
 * Returns { execution, unsignedTransaction? } - unsignedTransaction is present
 * when human approval / Casper Wallet signing is required.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      proposal?: RebalanceProposal;
      decisionId?: string;
    };

    let proposal = body.proposal ?? null;
    let decisionId = body.decisionId;

    if (!proposal) {
      const state = await getState();
      const latest = state.decisions.find((d) => d.proposal);
      if (!latest?.proposal) {
        return NextResponse.json(
          { error: "No proposal supplied and no recent decision has one." },
          { status: 400 }
        );
      }
      proposal = latest.proposal;
      decisionId = latest.id;
    }

    const result = await executeProposal(proposal, decisionId ?? "manual");
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "execute failed" },
      { status: 500 }
    );
  }
}
