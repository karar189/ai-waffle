/**
 * Studio agent composer block catalog — LLMs, MCPs, Skill.md, logic, execution.
 * Color tokens tuned for Waffle Trade light UI (lavender canvas, white cards).
 */

export type AgentBlockCategory = "llm" | "mcp" | "skill" | "logic" | "execution";

export interface AgentBlock {
  id: string;
  category: AgentBlockCategory;
  label: string;
  iconName: string;
  /** Real logo for LLM providers (palette + canvas). */
  logoId?: "openai" | "claude" | "deepseek" | "gemini" | "grok";
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const AGENT_BLOCKS: AgentBlock[] = [
  {
    id: "llm-openai",
    category: "llm",
    label: "OpenAI",
    iconName: "BrainCircuit",
    logoId: "openai",
    description: "GPT-4o / GPT-4.1 reasoning layer",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
  {
    id: "llm-claude",
    category: "llm",
    label: "Claude",
    iconName: "Sparkles",
    logoId: "claude",
    description: "Anthropic Claude Sonnet / Opus",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  {
    id: "llm-deepseek",
    category: "llm",
    label: "Deepseek",
    iconName: "Cpu",
    logoId: "deepseek",
    description: "Deepseek R1 / V3 models",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  {
    id: "llm-gemini",
    category: "llm",
    label: "Gemini",
    iconName: "Gem",
    logoId: "gemini",
    description: "Google Gemini 2.x models",
    color: "text-violet-700",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
  },
  {
    id: "llm-grok",
    category: "llm",
    label: "Grok",
    iconName: "Zap",
    logoId: "grok",
    description: "xAI Grok models",
    color: "text-rose-700",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
  },
  {
    id: "mcp-casper-cloud",
    category: "mcp",
    label: "Casper Cloud MCP",
    iconName: "Cloud",
    description: "Hosted CSPR.cloud MCP — live Casper chain data",
    color: "text-cyan-700",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
  },
  {
    id: "mcp-waffle-yield",
    category: "mcp",
    label: "Waffle Yield Router",
    iconName: "Network",
    description: "12-tool yield router MCP (snapshot, rebalance, LP)",
    color: "text-[#6D28D9]",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
  },
  {
    id: "mcp-custom",
    category: "mcp",
    label: "Custom MCP",
    iconName: "Plug",
    description: "Bring your own MCP server URL",
    color: "text-black/60",
    bgColor: "bg-black/[0.03]",
    borderColor: "border-black/10",
  },
  {
    id: "skill-playbook",
    category: "skill",
    label: "Skill.md Playbook",
    iconName: "FileText",
    description: "Attach a Skill.md behavior pack",
    color: "text-fuchsia-700",
    bgColor: "bg-fuchsia-50",
    borderColor: "border-fuchsia-200",
  },
  {
    id: "skill-cspr-cloud",
    category: "skill",
    label: "CSPR.cloud Skill",
    iconName: "BookOpen",
    description: "cspr.cloud/skill.md — Casper protocol playbook",
    color: "text-indigo-700",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
  },
  {
    id: "logic-monitor",
    category: "logic",
    label: "Monitor Yields",
    iconName: "Activity",
    description: "Poll live yield venues on an interval",
    color: "text-sky-700",
    bgColor: "bg-sky-50",
    borderColor: "border-sky-200",
  },
  {
    id: "logic-rank",
    category: "logic",
    label: "Rank Venues",
    iconName: "BarChart3",
    description: "Risk-adjusted venue ranking",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  {
    id: "logic-policy",
    category: "logic",
    label: "Policy Guardrails",
    iconName: "Shield",
    description: "Budget, cooldown, and risk limits",
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
  {
    id: "logic-llm-verdict",
    category: "logic",
    label: "LLM Verdict",
    iconName: "Brain",
    description: "LLM review / veto before execution",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  {
    id: "logic-approval",
    category: "logic",
    label: "Human Approval",
    iconName: "UserCheck",
    description: "Require wallet sign-off before moves",
    color: "text-lime-700",
    bgColor: "bg-lime-50",
    borderColor: "border-lime-200",
  },
  {
    id: "exec-dry-run",
    category: "execution",
    label: "Dry Run",
    iconName: "FlaskConical",
    description: "Simulate decisions without on-chain txs",
    color: "text-violet-700",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
  },
  {
    id: "exec-x402",
    category: "execution",
    label: "X402 Auto-Sign",
    iconName: "KeyRound",
    description: "Delegated signing via CSPR x402 facilitator",
    color: "text-[#241338]",
    bgColor: "bg-[#241338]/5",
    borderColor: "border-[#241338]/20",
  },
  {
    id: "exec-rebalance",
    category: "execution",
    label: "Execute Rebalance",
    iconName: "ArrowLeftRight",
    description: "Stake / unstake / redelegate CSPR",
    color: "text-purple-700",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
  {
    id: "exec-lp",
    category: "execution",
    label: "LP Deposit / Withdraw",
    iconName: "Coins",
    description: "CSPR.trade liquidity moves",
    color: "text-pink-700",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
  },
];

const BLOCKS_BY_ID = new Map(AGENT_BLOCKS.map((b) => [b.id, b]));

export function getAgentBlockById(id: string): AgentBlock | undefined {
  return BLOCKS_BY_ID.get(id);
}

export function blocksByCategory(category: AgentBlockCategory): AgentBlock[] {
  return AGENT_BLOCKS.filter((b) => b.category === category);
}

export const CATEGORY_LABELS: Record<AgentBlockCategory, string> = {
  llm: "LLM Providers",
  mcp: "MCP Servers",
  skill: "Skill.md Packs",
  logic: "Agent Logic",
  execution: "Execution Rails",
};

export const WAFFLE_MCP_TOOLS = [
  "get_yield_snapshot",
  "get_wallet_state",
  "get_agent_status",
  "propose_rebalance",
  "execute_rebalance",
  "get_lp_pools",
  "quote_lp_deposit",
  "execute_lp_deposit",
  "get_lp_positions",
  "quote_lp_withdraw",
  "execute_lp_withdraw",
] as const;

export const CASPER_CLOUD_MCP_TOOLS = [
  "get_account_info",
  "get_deploy",
  "get_validators",
  "get_era_summary",
  "query_state",
] as const;

export const LLM_MODELS: Record<string, string[]> = {
  "llm-openai": ["gpt-4o", "gpt-4.1", "gpt-4o-mini"],
  "llm-claude": ["claude-sonnet-4-20250514", "claude-opus-4-20250514", "claude-haiku-3-5-20241022"],
  "llm-deepseek": ["deepseek-chat", "deepseek-reasoner"],
  "llm-gemini": ["gemini-2.0-flash", "gemini-2.5-pro-preview"],
  "llm-grok": ["grok-2", "grok-3"],
};
