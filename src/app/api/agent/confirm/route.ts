import { NextRequest, NextResponse } from "next/server";
import { getExecution, updateExecution } from "@/lib/agent/store";
import { getDeploy } from "@/lib/casper/csprcloud";

export const dynamic = "force-dynamic";

/**
 * POST /api/agent/confirm
 * Checks a submitted execution's on-chain status via CSPR.cloud and flips it to
 * confirmed/failed. No-op (stays submitted) if the tx isn't indexed yet.
 * Body: { executionId }
 */
export async function POST(req: NextRequest) {
  try {
    const { executionId } = (await req.json().catch(() => ({}))) as {
      executionId?: string;
    };
    if (!executionId) {
      return NextResponse.json({ error: "executionId required" }, { status: 400 });
    }

    const exec = await getExecution(executionId);
    if (!exec?.deployHash) {
      return NextResponse.json(
        { error: "Execution has no deploy hash to confirm." },
        { status: 400 }
      );
    }
    if (exec.status === "confirmed" || exec.status === "failed") {
      return NextResponse.json({ execution: exec });
    }

    try {
      const deploy = await getDeploy(exec.deployHash);
      const failed = !!deploy.error_message;
      const processed =
        deploy.status === "processed" || !!deploy.block_hash || failed;
      if (processed) {
        const updated = await updateExecution(executionId, {
          status: failed ? "failed" : "confirmed",
          error: deploy.error_message ?? undefined,
        });
        return NextResponse.json({ execution: updated });
      }
    } catch {
      // Not indexed yet; keep as submitted.
    }
    return NextResponse.json({ execution: exec, pending: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "confirm failed" },
      { status: 500 }
    );
  }
}
