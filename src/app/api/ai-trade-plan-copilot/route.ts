import { NextRequest, NextResponse } from "next/server";
import { AVAILABLE_BLOCKS } from "@/lib/available-blocks";
import type { FlowCommand } from "@/lib/flow-commands";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

const BLOCK_LIST = AVAILABLE_BLOCKS.map((b) => `${b.id}: ${b.label}`).join(", ");

const SYSTEM_PROMPT = `You are an AI assistant for a trading strategy flowchart builder. The user can ask you to add, edit, or delete blocks, change parameters (amount, risk level, stop loss, take profit, market, etc.), or modify connections between blocks.

Current flow state will be sent as JSON: nodes (id, blockId, label, params) and edges (id, source, target).

When the user asks to modify the flow, you MUST reply with:
1. A short natural language confirmation (e.g. "I've added a Risk Check block set to moderate.").
2. An optional JSON array of commands in a fenced code block with the exact label \`\`\`commands

Put the JSON array on a new line after \`\`\`commands. Use only these command types:

- add_block: { "type": "add_block", "blockId": "<id>", "params": { "riskLevel": "moderate", "amountDollars": "100", "stopLoss": "3%", "takeProfit": "6%", "market": "Crypto (ETH)", "timeframe": "15m" }, "position": { "x": 100, "y": 200 } }
  position is optional; omit to append at end.
- edit_block: { "type": "edit_block", "nodeId": "<existing node id>", "params": { ... } }
- delete_block: { "type": "delete_block", "nodeId": "<id>" }
- connect: { "type": "connect", "sourceId": "<node id>", "targetId": "<node id>" }
- disconnect: { "type": "disconnect", "edgeId": "<edge id>" }

Valid blockIds: ${BLOCK_LIST}

Params can include: amountDollars, riskLevel (conservative|moderate|aggressive), stopLoss, takeProfit, market, timeframe, priceTarget, notes.

If the user just asks a question without requesting changes, reply normally and do not include a \`\`\`commands block.`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "CLAUDE_API_KEY is not set" }, { status: 500 });
    }

    const body = await req.json();
    const { messages, flow } = body as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      flow?: { nodes: unknown[]; edges: unknown[] };
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages array required" }, { status: 400 });
    }

    const userContent =
      flow && flow.nodes
        ? `Current flow:\n\`\`\`json\n${JSON.stringify(flow, null, 2)}\n\`\`\`\n\nUser: ${messages[messages.length - 1]?.content ?? ""}`
        : (messages[messages.length - 1]?.content as string);

    const anthropicMessages = messages.slice(0, -1).map((m) => ({
      role: m.role as "user" | "assistant",
      content: typeof m.content === "string" ? m.content : String(m.content),
    }));
    anthropicMessages.push({ role: "user" as const, content: userContent });

    const res = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_STRATEGY_MODEL || "claude-sonnet-4-5",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: anthropicMessages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Claude API error: ${res.status}`, details: errText },
        { status: res.status >= 500 ? 502 : 400 }
      );
    }

    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = data.content?.find((c) => c.type === "text")?.text?.trim() ?? "";

    const commands = parseCommands(text);
    const message = text.replace(/```commands[\s\S]*?```/g, "").trim();

    return NextResponse.json({ message: message || "Done.", commands });
  } catch (err) {
    console.error("ai-trade-plan-copilot error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

function parseCommands(text: string): FlowCommand[] {
  const match = text.match(/```commands\s*([\s\S]*?)```/);
  if (!match?.[1]) return [];
  try {
    const parsed = JSON.parse(match[1].trim()) as unknown;
    return Array.isArray(parsed) ? (parsed as FlowCommand[]) : [];
  } catch {
    return [];
  }
}
