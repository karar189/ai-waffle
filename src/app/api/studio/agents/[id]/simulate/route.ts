import { NextResponse } from "next/server";
import { getStudioAgent, updateStudioAgent } from "@/lib/studio/store";
import { simulateAgentFlow } from "@/lib/studio/validate";

type Params = { params: { id: string } };

export async function POST(_req: Request, { params }: Params) {
  const agent = await getStudioAgent(params.id);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const result = await simulateAgentFlow(agent);

  if (!result.success) {
    return NextResponse.json(
      { error: result.message, steps: result.steps },
      { status: 400 }
    );
  }

  await updateStudioAgent(params.id, {
    status: "simulated",
    lastSimulation: {
      at: new Date().toISOString(),
      success: true,
      steps: result.steps,
      message: result.message,
    },
  });

  return NextResponse.json({
    success: true,
    message: result.message,
    steps: result.steps,
  });
}
