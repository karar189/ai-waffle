/**
 * LLM reasoning layer (Claude in the loop).
 *
 * The deterministic policy engine remains the source of truth for the numbers
 * and the guardrails. Claude is given that fully-computed context and asked to
 * (a) explain WHY a reallocation makes sense in plain language and (b) return a
 * verdict it can use to VETO a move ("hold") if something looks off. It is
 * explicitly told not to invent numbers. This keeps the agent safe while making
 * the "AI decides" story real and inspectable.
 */

import type { PolicyConfig, Position, RebalanceProposal } from "@/lib/rebalance/types";

export interface LlmAssessment {
  verdict: "proceed" | "hold";
  rationale: string;
  confidence: number;
  model: string;
}

export interface DecisionContext {
  eraId: number;
  grossStakingApy: number;
  policy: PolicyConfig;
  positions: Position[];
  ranked: Array<{
    rank: number;
    protocol: string;
    apy: number;
    riskScore: number;
    riskAdjustedApy: number;
  }>;
  proposal: RebalanceProposal | null;
  noActionReason?: string;
}

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const ANTHROPIC_MODEL = process.env.CLAUDE_MODEL ?? "claude-3-5-sonnet-latest";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

/**
 * Which provider to use. Explicit LLM_PROVIDER wins; otherwise prefer whichever
 * key is present (OpenAI first, since that's what's funded here).
 */
function resolveProvider(): "openai" | "anthropic" | null {
  const explicit = process.env.LLM_PROVIDER?.toLowerCase();
  if (explicit === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (explicit === "anthropic" && process.env.CLAUDE_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.CLAUDE_API_KEY) return "anthropic";
  return null;
}

const SYSTEM_PROMPT = `You are the reasoning module of an autonomous yield-routing agent operating on the Casper blockchain.

A deterministic policy engine has ALREADY:
- pulled live on-chain staking data,
- ranked validators by risk-adjusted APY,
- checked hard safety guardrails (max move size, allocation cap, cooldown, min liquidity), and
- (optionally) produced a concrete rebalance proposal that already passed those guardrails.

Your job is NOT to recompute or invent any numbers. Only reason over the numbers you are given.
Decide whether the agent should PROCEED with the proposed move or HOLD (veto) it, and explain why in plain, concise language a portfolio owner would understand.

Prefer "hold" when: the yield improvement is marginal relative to the risk delta, the destination validator is notably riskier, the move concentrates too much, or there is no proposal.
Prefer "proceed" when: the risk-adjusted improvement is meaningful and the destination is not materially riskier.

Respond with ONLY a JSON object, no markdown, of the exact shape:
{"verdict":"proceed"|"hold","rationale":"<2-4 sentences>","confidence":<number 0..1>}`;

function extractJson(text: string): unknown | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function normalizeAssessment(
  parsed: { verdict?: string; rationale?: string; confidence?: number } | null,
  model: string
): LlmAssessment | null {
  if (!parsed || (parsed.verdict !== "proceed" && parsed.verdict !== "hold")) {
    return null;
  }
  return {
    verdict: parsed.verdict,
    rationale: parsed.rationale?.trim() || "(no rationale returned)",
    confidence:
      typeof parsed.confidence === "number"
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5,
    model,
  };
}

async function assessWithAnthropic(
  userContent: string,
  signal: AbortSignal
): Promise<LlmAssessment | null> {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.CLAUDE_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: `Decision context:\n${userContent}\n\nReturn only the JSON verdict.` },
      ],
    }),
    signal,
  });
  if (!res.ok) {
    console.error("[agent/llm] Anthropic error", res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = data.content?.map((c) => c.text ?? "").join("").trim() ?? "";
  return normalizeAssessment(
    extractJson(text) as { verdict?: string; rationale?: string; confidence?: number } | null,
    ANTHROPIC_MODEL
  );
}

async function assessWithOpenAI(
  userContent: string,
  signal: AbortSignal
): Promise<LlmAssessment | null> {
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_tokens: 400,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Decision context:\n${userContent}\n\nReturn only the JSON verdict.` },
      ],
    }),
    signal,
  });
  if (!res.ok) {
    console.error("[agent/llm] OpenAI error", res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim() ?? "";
  return normalizeAssessment(
    extractJson(text) as { verdict?: string; rationale?: string; confidence?: number } | null,
    OPENAI_MODEL
  );
}

/**
 * Ask the configured LLM to assess a decision. Best-effort: returns null if no
 * provider key is configured or the call fails, so the agent still works
 * deterministically.
 */
export async function assessWithLlm(
  ctx: DecisionContext
): Promise<LlmAssessment | null> {
  const provider = resolveProvider();
  if (!provider) return null;

  const userContent = JSON.stringify(
    {
      currentEra: ctx.eraId,
      networkGrossStakingApy: ctx.grossStakingApy,
      policy: {
        minYieldDelta: ctx.policy.minYieldDelta,
        maxAllocationPct: ctx.policy.maxAllocationPct,
        autoSignLimitCspr: ctx.policy.autoSignLimitCspr,
        riskAversion: ctx.policy.riskAversion,
      },
      currentPositions: ctx.positions.map((p) => ({
        venue: p.protocol,
        amountCspr: Math.round(p.amountCspr),
      })),
      topRankedVenues: ctx.ranked.slice(0, 5),
      proposedMove: ctx.proposal
        ? {
            from: ctx.proposal.fromProtocol,
            to: ctx.proposal.toProtocol,
            amountCspr: Math.round(ctx.proposal.amountCspr),
            currentApy: ctx.proposal.currentApy,
            targetApy: ctx.proposal.targetApy,
            apyDelta: ctx.proposal.apyDelta,
            expectedAnnualGainCspr: Math.round(
              ctx.proposal.expectedAnnualGainCspr
            ),
            signingPath: ctx.proposal.signingPath,
          }
        : null,
      noActionReason: ctx.noActionReason ?? null,
    },
    null,
    2
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    return provider === "openai"
      ? await assessWithOpenAI(userContent, controller.signal)
      : await assessWithAnthropic(userContent, controller.signal);
  } catch (e) {
    console.error("[agent/llm] assessment failed:", e);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
