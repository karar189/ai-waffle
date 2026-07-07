/**
 * Chat model options for the Copilot.
 * Claude models are used when CLAUDE_API_KEY is set.
 * Other providers can be added via env (OPENAI_API_KEY, DEEPSEEK_API_KEY) later.
 */

export const CLAUDE_MODELS = [
  { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", provider: "claude" },
  { id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5 (Sep 29)", provider: "claude" },
  { id: "claude-opus-4-5", name: "Claude Opus 4.5", provider: "claude" },
  { id: "claude-opus-4-5-20251101", name: "Claude Opus 4.5 (Nov 01)", provider: "claude" },
  { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", provider: "claude" },
  { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", provider: "claude" },
  { id: "claude-3-5-haiku-latest", name: "Claude 3.5 Haiku (latest)", provider: "claude" },
  { id: "claude-3-7-sonnet-20250219", name: "Claude 3.7 Sonnet", provider: "claude" },
  { id: "claude-3-opus-20240229", name: "Claude 3 Opus", provider: "claude" },
  { id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet", provider: "claude" },
  { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", provider: "claude" },
  { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", provider: "claude" },
  { id: "claude-sonnet-4-0", name: "Claude Sonnet 4.0", provider: "claude" },
  { id: "claude-opus-4-0", name: "Claude Opus 4.0", provider: "claude" },
] as const;

export type ClaudeModelId = (typeof CLAUDE_MODELS)[number]["id"];
