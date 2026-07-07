import { NextRequest, NextResponse } from "next/server";
import { updateExecution, markMoveExecuted } from "@/lib/agent/store";
import { submitSignedFromJson, submitWithSignature } from "@/lib/casper/deploy";

export const dynamic = "force-dynamic";

/**
 * POST /api/agent/approve
 * Approve/submit or reject a pending (human-approval) execution.
 * Body (approve, one of):
 *   { executionId, action: "approve", signedTransaction }
 *   { executionId, action: "approve", unsignedTransaction, signatureHex, publicKey }
 * Body (reject):
 *   { executionId, action: "reject" }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      executionId?: string;
      action?: "approve" | "reject";
      signedTransaction?: unknown;
      unsignedTransaction?: unknown;
      signatureHex?: string;
      publicKey?: string;
    };

    if (!body.executionId) {
      return NextResponse.json({ error: "executionId required" }, { status: 400 });
    }

    if (body.action === "reject") {
      const updated = await updateExecution(body.executionId, { status: "rejected" });
      return NextResponse.json({ execution: updated });
    }

    const hasSigned = !!body.signedTransaction;
    const hasSigParts =
      !!body.unsignedTransaction && !!body.signatureHex && !!body.publicKey;
    if (!hasSigned && !hasSigParts) {
      return NextResponse.json(
        { error: "Provide signedTransaction, or unsignedTransaction + signatureHex + publicKey." },
        { status: 400 }
      );
    }

    try {
      const { transactionHash } = hasSigned
        ? await submitSignedFromJson(body.signedTransaction)
        : await submitWithSignature(
            body.unsignedTransaction,
            body.signatureHex!,
            body.publicKey!
          );
      await markMoveExecuted();
      const updated = await updateExecution(body.executionId, {
        status: "submitted",
        deployHash: transactionHash,
      });
      return NextResponse.json({ execution: updated });
    } catch (e) {
      const updated = await updateExecution(body.executionId, {
        status: "failed",
        error: e instanceof Error ? e.message : "submit failed",
      });
      return NextResponse.json({ execution: updated }, { status: 502 });
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "approve failed" },
      { status: 500 }
    );
  }
}
