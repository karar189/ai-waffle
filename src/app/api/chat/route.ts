import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

const COPILOT_SYSTEM = `You are a retail trading copilot. Your job is to understand the user's intent and help them plan trades by gathering key information. Be concise and friendly. Ask one or two questions at a time—don't overwhelm.

When relevant, cover these six areas (ask naturally in conversation; don't list them all at once):
1. **Where do they want to trade?** — Crypto, global/forex, or Indian markets?
2. **What assets?** — Specific symbols, pairs, or sectors (e.g. BTC, ETH, Nifty 50, EUR/USD).
3. **Any strategy in mind?** — e.g. DCA, grid bot, swing, scalping, or "not sure".
4. **How much do they want to invest?** — Amount or range (you can use INR, USD, or relative terms).
5. **Risk tolerance?** — Conservative, moderate, or aggressive; max drawdown or loss they can accept.
6. **News / alpha sources?** — Any sources they want to use for triggers or alpha (e.g. Twitter, specific newsletters, earnings, macro).

If the user's message already answers some of these, acknowledge it and ask the next relevant question. Once you have enough context, summarize their trade plan and suggest next steps (e.g. open Trade Simulation, pick a strategy, set alerts).`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "CLAUDE_API_KEY is not set in environment" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { messages, model } = body as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      model?: string;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages array is required and must not be empty" },
        { status: 400 }
      );
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role !== "user") {
      return NextResponse.json(
        { error: "Last message must be from user" },
        { status: 400 }
      );
    }

    const anthropicMessages = messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: typeof m.content === "string" ? m.content : String(m.content),
    }));

    const res = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model || process.env.CLAUDE_CHAT_MODEL || "claude-sonnet-4-5",
        max_tokens: 1024,
        system: COPILOT_SYSTEM,
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

    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text =
      data.content?.find((b) => b.type === "text")?.text ?? "";

    return NextResponse.json({ message: text });
  } catch (e) {
    console.error("[api/chat]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Chat request failed" },
      { status: 500 }
    );
  }
}
