import type { Node, Edge } from "@xyflow/react";
import type { BlockNodeData, BlockEditableParams } from "@/components/dashboard/flow-block-node";
import { getBlockById } from "@/lib/available-blocks";

export type FlowCommand =
  | { type: "add_block"; blockId: string; params?: BlockEditableParams; position?: { x: number; y: number } }
  | { type: "edit_block"; nodeId: string; params: BlockEditableParams }
  | { type: "delete_block"; nodeId: string }
  | { type: "connect"; sourceId: string; targetId: string }
  | { type: "disconnect"; edgeId: string };

const DEFAULT_NODE_OFFSET = { x: 80, y: 100 };
const NODE_GAP = 120;

export function applyFlowCommands(
  nodes: Node<BlockNodeData>[],
  edges: Edge[],
  commands: FlowCommand[]
): { nodes: Node<BlockNodeData>[]; edges: Edge[] } {
  let nextNodes = [...nodes];
  let nextEdges = [...edges];

  for (const cmd of commands) {
    if (cmd.type === "add_block") {
      const block = getBlockById(cmd.blockId);
      if (!block) continue;
      const nodeId = `${cmd.blockId}-${Date.now()}`;
      const position = cmd.position ?? defaultPosition(nextNodes);
      nextNodes = nextNodes.concat({
        id: nodeId,
        type: "block",
        position,
        data: {
          label: block.label,
          blockType: block.type,
          iconName: block.iconName,
          blockId: block.id,
          params: cmd.params,
        },
      });
    } else if (cmd.type === "edit_block") {
      nextNodes = nextNodes.map((n) =>
        n.id === cmd.nodeId
          ? { ...n, data: { ...n.data, params: { ...n.data.params, ...cmd.params } } }
          : n
      );
    } else if (cmd.type === "delete_block") {
      nextNodes = nextNodes.filter((n) => n.id !== cmd.nodeId);
      nextEdges = nextEdges.filter((e) => e.source !== cmd.nodeId && e.target !== cmd.nodeId);
    } else if (cmd.type === "connect") {
      const exists = nextEdges.some((e) => e.source === cmd.sourceId && e.target === cmd.targetId);
      if (!exists) {
        nextEdges = nextEdges.concat({
          id: `e-${cmd.sourceId}-${cmd.targetId}-${Date.now()}`,
          source: cmd.sourceId,
          target: cmd.targetId,
        });
      }
    } else if (cmd.type === "disconnect") {
      nextEdges = nextEdges.filter((e) => e.id !== cmd.edgeId);
    }
  }

  return { nodes: nextNodes, edges: nextEdges };
}

function defaultPosition(nodes: Node<BlockNodeData>[]): { x: number; y: number } {
  if (nodes.length === 0) return DEFAULT_NODE_OFFSET;
  const last = nodes[nodes.length - 1];
  const y = (last?.position?.y ?? 0) + NODE_GAP;
  return { x: DEFAULT_NODE_OFFSET.x, y };
}

/** Serialize nodes/edges for the API (ids, block types, labels, params only). */
export function serializeFlowForApi(
  nodes: Node<BlockNodeData>[],
  edges: Edge[]
): { nodes: Array<{ id: string; blockId?: string; label: string; params?: BlockEditableParams }>; edges: Array<{ id: string; source: string; target: string }> } {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      blockId: n.data.blockId,
      label: n.data.label,
      params: n.data.params,
    })),
    edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
  };
}
