import { NextRequest, NextResponse } from "next/server";
import { AVAILABLE_BLOCKS } from "@/lib/available-blocks";
import type { SavedStrategy } from "@/lib/strategy-parser";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

const SYSTEM_PROMPT = `You are a trading workflow mapper. Given a trading strategy (as JSON) and a fixed list of workflow blocks, you must choose which blocks best represent the strategy and return their IDs in the correct execution order.

Available blocks (use ONLY these ids):
${AVAILABLE_BLOCKS.map((b) => `- ${b.id}: ${b.label} — ${b.description}`).join("\n")}

Rules:
1. Return a JSON array of block ids only, e.g. ["time-trigger", "market-condition", "risk-check", "stop-loss", "take-profit"].
2. Order must be logical: trigger(s) first, then condition(s), then action(s). Analysis blocks can go after conditions if they fit.
3. Map strategy concepts to the closest block: timeframe → time-trigger; market/entry → market-condition or indicator-trigger; risk/position/leverage → risk-check; stop loss → stop-loss; take profit → take-profit; price levels → price-trigger.
4. Do not invent ids. Use only the ids from the list above.
5. Prefer a minimal, clear workflow (typically 4–8 blocks).`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "CLAUDE_API_KEY is not set" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const strategy = body.strategy as SavedStrategy | undefined;

    if (!strategy?.parsed) {
      return NextResponse.json(
        { error: "strategy with parsed field is required" },
        { status: 400 }
      );
    }

    const parsedStr = JSON.stringify(strategy.parsed, null, 2);
    const hasSparseParsed = Object.keys(strategy.parsed).filter((k) => strategy.parsed[k as keyof typeof strategy.parsed]).length <= 2;
    const userContent = hasSparseParsed && strategy.rawText
      ? `Map this trading strategy to block ids. The parsed JSON is minimal, so use the full strategy text below to infer triggers, conditions, and actions (e.g. stop-loss, price alerts, risk, market). Return only a JSON array of block ids, no other text.

Strategy title: ${strategy.title ?? "Imported strategy"}

Full strategy text:
---
${strategy.rawText.slice(0, 4000)}
---

Parsed (for reference): ${parsedStr}`
      : `Map this strategy to block ids. Return only a JSON array of block ids, no other text.

Strategy title: ${strategy.title ?? "Imported strategy"}

Parsed strategy:
${parsedStr}`;

    const res = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_STRATEGY_MODEL || "claude-sonnet-4-5",
        max_tokens: 256,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
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
    const text = data.content?.find((c) => c.type === "text")?.text?.trim() ?? "";

    const validIds = new Set(AVAILABLE_BLOCKS.map((b) => b.id));
    let blockIds: string[] = [];

    const jsonMatch = text.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as unknown;
        if (Array.isArray(parsed)) {
          blockIds = parsed
            .filter((id): id is string => typeof id === "string")
            .filter((id) => validIds.has(id));
        }
      } catch {
        // fallback below
      }
    }

    if (blockIds.length === 0) {
      blockIds = fallbackBlockIds(strategy);
    }
    if (blockIds.length <= 1 && strategy.rawText) {
      blockIds = fallbackFromRawText(strategy, blockIds);
    }

    return NextResponse.json({ blockIds });
  } catch (err) {
    console.error("strategy-to-blocks error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

function fallbackBlockIds(strategy: SavedStrategy): string[] {
  const p = strategy.parsed;
  const ids: string[] = [];
  if (p.timeframe) ids.push("time-trigger");
  if (p.market || p.entrySignals?.length) ids.push("market-condition");
  if (p.positionSizing || p.maxLossPerTrade || p.leverage) ids.push("risk-check");
  if (p.stopLoss) ids.push("stop-loss");
  if (p.takeProfit) ids.push("take-profit");
  if (ids.length === 0) ids.push("indicator-trigger", "risk-check", "stop-loss", "take-profit");
  return ids;
}

/** When LLM and fallback yield ≤1 block, infer more from rawText. */
function fallbackFromRawText(strategy: SavedStrategy, existing: string[]): string[] {
  const t = (strategy.rawText ?? "").toLowerCase();
  const ids = [...existing];
  if (!ids.includes("time-trigger") && /quick trades|hours to days|scalping|momentum|short-term|schedule/i.test(t))
    ids.push("time-trigger");
  if (!ids.includes("market-condition") && (strategy.parsed?.market || /market:|crypto|eth|btc|pair/i.test(t)))
    ids.push("market-condition");
  if (!ids.includes("risk-check") && (/max loss|risk|capital|position|%\s*stop/i.test(t)))
    ids.push("risk-check");
  if (!ids.includes("stop-loss") && (/stop-?loss|stop at \d+%|\d+%\s*below|protect.*loss/i.test(t)))
    ids.push("stop-loss");
  if (!ids.includes("take-profit") && (/take profit|target|exit at/i.test(t)))
    ids.push("take-profit");
  if (!ids.includes("price-trigger") && (/price alert|key levels|support|resistance|alert/i.test(t)))
    ids.push("price-trigger");
  for (const id of ["indicator-trigger", "risk-check", "stop-loss", "take-profit"]) {
    if (ids.length >= 5) break;
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}
