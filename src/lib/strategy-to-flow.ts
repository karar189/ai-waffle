import type { Node, Edge } from "@xyflow/react";
import type { BlockNodeData, BlockEditableParams } from "@/components/dashboard/flow-block-node";
import type { SavedStrategy } from "./strategy-parser";
import { getBlockById } from "./available-blocks";

const NODE_HEIGHT = 80;
const GAP = 100;
const START_X = 80;

/**
 * Build workflow from an ordered list of palette block ids.
 * Uses existing block definitions so the canvas shows the same blocks as the palette.
 * Optionally enriches labels with strategy details (e.g. "Set Stop Loss (3-4%)").
 */
export function blocksToFlowNodesAndEdges(
  blockIds: string[],
  strategy?: SavedStrategy | null
): { nodes: Node<BlockNodeData>[]; edges: Edge[] } {
  const nodes: Node<BlockNodeData>[] = [];
  const edges: Edge[] = [];
  const p = strategy?.parsed;
  let y = 0;
  let lastId: string | null = null;

  const detailForBlock = (blockId: string): string => {
    if (!p) return "";
    if (blockId === "stop-loss" && p.stopLoss) return ` (${p.stopLoss.slice(0, 24)}${p.stopLoss.length > 24 ? "…" : ""})`;
    if (blockId === "take-profit" && p.takeProfit) return ` (${p.takeProfit.slice(0, 24)}${p.takeProfit.length > 24 ? "…" : ""})`;
    if (blockId === "risk-check" && (p.maxLossPerTrade || p.positionSizing))
      return ` (${[p.maxLossPerTrade, p.positionSizing].filter(Boolean).join(" · ").slice(0, 24)}…)`;
    if (blockId === "market-condition" && p.market) return ` (${p.market.slice(0, 24)}${p.market.length > 24 ? "…" : ""})`;
    if (blockId === "time-trigger" && p.timeframe) return ` (${p.timeframe.slice(0, 24)}${p.timeframe.length > 24 ? "…" : ""})`;
    return "";
  };

  function initialParamsForBlock(blockId: string, parsed: SavedStrategy["parsed"] | undefined): BlockEditableParams | undefined {
    if (!parsed || typeof parsed !== "object") return undefined;
    const params: BlockEditableParams = {};
    if (parsed.market) params.market = parsed.market.replace(/\*+/g, "").trim();
    if (parsed.capital) {
      const num = parsed.capital.replace(/[^0-9.]/g, "");
      if (num) params.amountDollars = num;
    }
    if (parsed.stopLoss) params.stopLoss = parsed.stopLoss;
    if (parsed.takeProfit) params.takeProfit = parsed.takeProfit;
    if (parsed.timeframe) params.timeframe = parsed.timeframe;
    if (blockId === "risk-check" && (parsed.maxLossPerTrade || parsed.positionSizing)) {
      params.notes = [parsed.maxLossPerTrade, parsed.positionSizing].filter(Boolean).join(" · ");
    }
    return Object.keys(params).length ? params : undefined;
  }

  for (let i = 0; i < blockIds.length; i++) {
    const block = getBlockById(blockIds[i]);
    if (!block) continue;

    const nodeId = `imported-${block.id}-${i}`;
    const detail = detailForBlock(block.id);
    const label = detail ? `${block.label}${detail}` : block.label;
    const params = p ? initialParamsForBlock(block.id, p) : undefined;

    nodes.push({
      id: nodeId,
      type: "block",
      position: { x: START_X, y },
      data: {
        label: block.label,
        blockType: block.type,
        iconName: block.iconName,
        blockId: block.id,
        params,
      },
    });
    if (lastId) edges.push({ id: `e-${lastId}-${nodeId}`, source: lastId, target: nodeId });
    lastId = nodeId;
    y += NODE_HEIGHT + GAP;
  }

  return { nodes, edges };
}

/**
 * Legacy: convert a saved strategy into flow nodes using a fixed mapping (no LLM).
 * Prefer using the API to get blockIds, then blocksToFlowNodesAndEdges(blockIds, strategy).
 */
export function strategyToFlowNodesAndEdges(strategy: SavedStrategy): {
  nodes: Node<BlockNodeData>[];
  edges: Edge[];
} {
  const p = strategy.parsed;
  const blockIds: string[] = [];
  if (p.timeframe) blockIds.push("time-trigger");
  if (p.market || p.entrySignals?.length) blockIds.push("market-condition");
  if (p.positionSizing || p.maxLossPerTrade || p.leverage) blockIds.push("risk-check");
  if (p.stopLoss) blockIds.push("stop-loss");
  if (p.takeProfit) blockIds.push("take-profit");
  if (blockIds.length === 0) blockIds.push("indicator-trigger", "risk-check", "stop-loss", "take-profit");
  return blocksToFlowNodesAndEdges(blockIds, strategy);
}
