import { NextResponse } from "next/server";
import {
  deleteStudioAgent,
  getStudioAgent,
  updateStudioAgent,
} from "@/lib/studio/store";
import type { UpdateAgentInput } from "@/lib/studio/types";

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  const agent = await getStudioAgent(params.id);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }
  return NextResponse.json({ agent });
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const body = (await req.json()) as UpdateAgentInput;
    const agent = await updateStudioAgent(params.id, body);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    return NextResponse.json({ agent });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update agent" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const ok = await deleteStudioAgent(params.id);
  if (!ok) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
