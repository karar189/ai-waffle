import { NextResponse } from "next/server";
import { getStudioAgent, updateStudioAgent } from "@/lib/studio/store";
import { validateAgentFlow } from "@/lib/studio/validate";
import { CSPR_CLOUD } from "@/lib/casper/config";
import {
  setAutoExecute,
  setAutonomyInterval,
  setRunning,
  updatePolicy,
} from "@/lib/agent/store";

type Params = { params: { id: string } };

export async function POST(_req: Request, { params }: Params) {
  const agent = await getStudioAgent(params.id);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const validation = validateAgentFlow(agent.nodes, agent.edges);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.errors.join(" "), warnings: validation.warnings },
      { status: 400 }
    );
  }

  const usesX402 = agent.nodes.some((n) => n.data.blockId === "exec-x402");
  const usesDryRun = agent.nodes.some((n) => n.data.blockId === "exec-dry-run");
  const monitorBlock = agent.nodes.find((n) => n.data.blockId === "logic-monitor");
  const policyBlock = agent.nodes.find((n) => n.data.blockId === "logic-policy");

  const intervalSec = Number(monitorBlock?.data.params?.intervalSec ?? 60);
  const minApyDelta = Number(policyBlock?.data.params?.minApyDelta ?? 0.5);

  await updatePolicy({
    minYieldDelta: Number.isFinite(minApyDelta) ? minApyDelta / 100 : 0.005,
  });
  await setAutonomyInterval(Number.isFinite(intervalSec) ? intervalSec : 60);

  if (usesDryRun) {
    await setAutoExecute(false);
  } else if (usesX402) {
    await setAutoExecute(true);
  }

  await setRunning(true);

  const deployed = await updateStudioAgent(params.id, {
    status: "deployed",
    nodes: agent.nodes,
    edges: agent.edges,
  });

  return NextResponse.json({
    success: true,
    agent: deployed,
    message: usesX402
      ? `Agent deployed with X402 rail (${CSPR_CLOUD.x402FacilitatorUrl}). Autonomy every ${intervalSec}s.`
      : usesDryRun
        ? `Agent deployed in dry-run mode. Monitor interval ${intervalSec}s.`
        : `Agent deployed. Autonomy interval ${intervalSec}s.`,
    executionRail: usesX402 ? "x402" : usesDryRun ? "dry_run" : "live",
    x402Facilitator: usesX402 ? CSPR_CLOUD.x402FacilitatorUrl : undefined,
  });
}
