/**
 * Shared block definitions for the AI Trade Plan builder.
 * Used by the palette and by strategy-to-flow when building workflows from LLM-selected blocks.
 */

export type BlockType = "trigger" | "condition" | "action" | "analysis";

export interface Block {
  id: string;
  type: BlockType;
  label: string;
  iconName: string;
  description: string;
}

export const AVAILABLE_BLOCKS: Block[] = [
  { id: "price-trigger", type: "trigger", label: "Price Alert", iconName: "Bell", description: "Trigger when price reaches target" },
  { id: "indicator-trigger", type: "trigger", label: "Indicator Signal", iconName: "TrendingUp", description: "RSI, MACD, or other indicator" },
  { id: "time-trigger", type: "trigger", label: "Time-Based", iconName: "Clock", description: "Schedule at specific time" },
  { id: "if-condition", type: "condition", label: "If/Then", iconName: "GitBranch", description: "Conditional logic" },
  { id: "risk-check", type: "condition", label: "Risk Check", iconName: "Shield", description: "Validate risk parameters" },
  { id: "market-condition", type: "condition", label: "Market Condition", iconName: "BarChart3", description: "Check market state" },
  { id: "buy-action", type: "action", label: "Buy Order", iconName: "TrendingUp", description: "Execute buy order" },
  { id: "sell-action", type: "action", label: "Sell Order", iconName: "TrendingDown", description: "Execute sell order" },
  { id: "stop-loss", type: "action", label: "Set Stop Loss", iconName: "AlertTriangle", description: "Set protective stop" },
  { id: "take-profit", type: "action", label: "Take Profit", iconName: "Target", description: "Set profit target" },
  { id: "analyze-price", type: "analysis", label: "Price Analysis", iconName: "BarChart3", description: "AI price analysis" },
  { id: "analyze-risk", type: "analysis", label: "Risk Analysis", iconName: "Shield", description: "Calculate risk metrics" },
  { id: "optimize", type: "analysis", label: "Optimize", iconName: "Sparkles", description: "AI optimization" },
];

const BLOCKS_BY_ID = new Map(AVAILABLE_BLOCKS.map((b) => [b.id, b]));

export function getBlockById(id: string): Block | undefined {
  return BLOCKS_BY_ID.get(id);
}
