import { NextResponse } from "next/server";
import { createStudioAgent, listStudioAgents } from "@/lib/studio/store";
import type { CreateAgentInput } from "@/lib/studio/types";

export async function GET() {
  const agents = await listStudioAgents();
  return NextResponse.json({ agents });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateAgentInput;
    const agent = await createStudioAgent(body);
    return NextResponse.json({ agent }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create agent" },
      { status: 500 }
    );
  }
}
