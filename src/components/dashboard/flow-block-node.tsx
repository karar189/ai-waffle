"use client";

import { memo, useState } from "react";
import { Handle, type Node, type NodeProps, Position, useReactFlow } from "@xyflow/react";
import {
  Bell,
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  BarChart3,
  Clock,
  AlertTriangle,
  GitBranch,
  Sparkles,
  Pencil,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Bell,
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  BarChart3,
  Clock,
  AlertTriangle,
  GitBranch,
  Sparkles,
};

/** Editable fields stored per block (optional). */
export type BlockEditableParams = {
  amountDollars?: string;
  riskLevel?: "conservative" | "moderate" | "aggressive";
  stopLoss?: string;
  takeProfit?: string;
  market?: string;
  timeframe?: string;
  priceTarget?: string;
  notes?: string;
};

export type BlockNodeData = {
  label: string;
  blockType: "trigger" | "condition" | "action" | "analysis";
  iconName?: string;
  /** Block id from palette (e.g. risk-check, stop-loss) for edit form. */
  blockId?: string;
  /** User-editable parameters. */
  params?: BlockEditableParams;
};

type BlockFlowNode = Node<BlockNodeData>;

function displayLabel(data: BlockNodeData): string {
  const base = data.label;
  const p = data.params;
  if (!p) return base;
  const parts: string[] = [];
  if (p.amountDollars) parts.push(`$${p.amountDollars}`);
  if (p.riskLevel) parts.push(p.riskLevel);
  if (p.stopLoss) parts.push(`SL: ${p.stopLoss}`);
  if (p.takeProfit) parts.push(`TP: ${p.takeProfit}`);
  if (p.market) parts.push(p.market);
  if (p.timeframe) parts.push(p.timeframe);
  if (p.priceTarget) parts.push(p.priceTarget);
  if (parts.length === 0) return base;
  return `${base} (${parts.join(", ")})`;
}

function BlockNodeComponent({ id, data }: NodeProps<BlockFlowNode>) {
  const { setNodes } = useReactFlow<BlockFlowNode>();
  const [open, setOpen] = useState(false);
  const type = data.blockType ?? "trigger";
  const Icon = (data.iconName && ICON_MAP[data.iconName]) || BarChart3;
  const params = data.params ?? {};
  const blockId = data.blockId ?? (() => {
    const parts = id.split("-");
    if (parts[0] === "imported") return parts.slice(1, -1).join("-");
    return parts.slice(0, -1).join("-") || id;
  })();

  const colorClasses = {
    trigger: {
      border: "border-emerald-500/50 bg-emerald-500/10",
      icon: "bg-emerald-500/20 text-emerald-400",
    },
    condition: {
      border: "border-blue-500/50 bg-blue-500/10",
      icon: "bg-blue-500/20 text-blue-400",
    },
    action: {
      border: "border-purple-500/50 bg-purple-500/10",
      icon: "bg-purple-500/20 text-purple-400",
    },
    analysis: {
      border: "border-amber-500/50 bg-amber-500/10",
      icon: "bg-amber-500/20 text-amber-400",
    },
  };

  const c = colorClasses[type];

  const updateData = (next: Partial<BlockNodeData>) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...next } } : n
      )
    );
  };

  const saveParams = (nextParams: BlockEditableParams) => {
    updateData({ params: { ...params, ...nextParams } });
    setOpen(false);
  };

  return (
    <div
      className={`rounded-lg border-2 ${c.border} p-4 shadow-lg backdrop-blur-sm min-w-[180px]`}
    >
      <Handle type="target" position={Position.Top} className="!h-3 !w-3 !border-2 !border-white/40 !bg-black" />
      <div className="flex items-center gap-2">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${c.icon}`}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{displayLabel(data)}</p>
          <p className="text-xs capitalize text-neutral-400">{type}</p>
        </div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 rounded-md text-neutral-400 hover:bg-white/10 hover:text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <Pencil className="size-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-80 border-white/10 bg-neutral-950 text-white"
            align="end"
            side="right"
            onClick={(e) => e.stopPropagation()}
          >
            <BlockEditForm
              blockId={blockId}
              blockType={type}
              params={params}
              onSave={saveParams}
              onCancel={() => setOpen(false)}
            />
          </PopoverContent>
        </Popover>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-3 !w-3 !border-2 !border-white/40 !bg-black" />
    </div>
  );
}

const RISK_OPTIONS = [
  { value: "conservative", label: "Conservative" },
  { value: "moderate", label: "Moderate" },
  { value: "aggressive", label: "Aggressive" },
] as const;

function BlockEditForm({
  blockId,
  blockType,
  params,
  onSave,
  onCancel,
}: {
  blockId: string;
  blockType: BlockNodeData["blockType"];
  params: BlockEditableParams;
  onSave: (p: BlockEditableParams) => void;
  onCancel: () => void;
}) {
  const [amountDollars, setAmountDollars] = useState(params.amountDollars ?? "");
  const [riskLevel, setRiskLevel] = useState<string>(params.riskLevel ?? "");
  const [stopLoss, setStopLoss] = useState(params.stopLoss ?? "");
  const [takeProfit, setTakeProfit] = useState(params.takeProfit ?? "");
  const [market, setMarket] = useState(params.market ?? "");
  const [timeframe, setTimeframe] = useState(params.timeframe ?? "");
  const [priceTarget, setPriceTarget] = useState(params.priceTarget ?? "");
  const [notes, setNotes] = useState(params.notes ?? "");

  const handleSave = () => {
    const next: BlockEditableParams = { ...params };
    if (showAmount) next.amountDollars = amountDollars.trim() || undefined;
    if (showRisk) next.riskLevel = (riskLevel as BlockEditableParams["riskLevel"]) || undefined;
    if (showStopLoss) next.stopLoss = stopLoss.trim() || undefined;
    if (showTakeProfit) next.takeProfit = takeProfit.trim() || undefined;
    if (showMarket) next.market = market.trim() || undefined;
    if (showTimeframe) next.timeframe = timeframe.trim() || undefined;
    if (showPriceTarget) next.priceTarget = priceTarget.trim() || undefined;
    next.notes = notes.trim() || undefined;
    onSave(next);
  };

  const showAmount = ["risk-check", "buy-action", "sell-action"].includes(blockId) || blockType === "action" || blockType === "condition";
  const showRisk = blockId === "risk-check";
  const showStopLoss = blockId === "stop-loss";
  const showTakeProfit = blockId === "take-profit";
  const showMarket = blockId === "market-condition";
  const showTimeframe = ["time-trigger", "indicator-trigger"].includes(blockId);
  const showPriceTarget = blockId === "price-trigger";

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-white">Edit block</p>
      <div className="space-y-3">
        {showAmount && (
          <div>
            <Label className="text-neutral-300">Amount ($)</Label>
            <Input
              value={amountDollars}
              onChange={(e) => setAmountDollars(e.target.value)}
              placeholder="e.g. 100"
              className="mt-1 border-white/20 bg-white/5 text-white"
            />
          </div>
        )}
        {showRisk && (
          <div>
            <Label className="text-neutral-300">Risk level</Label>
            <Select value={riskLevel} onValueChange={setRiskLevel}>
              <SelectTrigger className="mt-1 border-white/20 bg-white/5 text-white">
                <SelectValue placeholder="Select risk" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-neutral-950">
                {RISK_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-white focus:bg-white/10">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {showStopLoss && (
          <div>
            <Label className="text-neutral-300">Stop loss</Label>
            <Input
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="e.g. 3% or $20"
              className="mt-1 border-white/20 bg-white/5 text-white"
            />
          </div>
        )}
        {showTakeProfit && (
          <div>
            <Label className="text-neutral-300">Take profit</Label>
            <Input
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              placeholder="e.g. 6% or 2:1 R:R"
              className="mt-1 border-white/20 bg-white/5 text-white"
            />
          </div>
        )}
        {showMarket && (
          <div>
            <Label className="text-neutral-300">Market / pair</Label>
            <Input
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              placeholder="e.g. Crypto (ETH), BTC/USDT"
              className="mt-1 border-white/20 bg-white/5 text-white"
            />
          </div>
        )}
        {showTimeframe && (
          <div>
            <Label className="text-neutral-300">Timeframe</Label>
            <Input
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              placeholder="e.g. 15m, 1h, daily"
              className="mt-1 border-white/20 bg-white/5 text-white"
            />
          </div>
        )}
        {showPriceTarget && (
          <div>
            <Label className="text-neutral-300">Price target</Label>
            <Input
              value={priceTarget}
              onChange={(e) => setPriceTarget(e.target.value)}
              placeholder="e.g. 3500 or 3500-3600"
              className="mt-1 border-white/20 bg-white/5 text-white"
            />
          </div>
        )}
        <div>
          <Label className="text-neutral-300">Notes</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes"
            className="mt-1 border-white/20 bg-white/5 text-white"
          />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-500" onClick={handleSave}>
          Save
        </Button>
        <Button size="sm" variant="outline" className="border-white/20" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export const BlockNode = memo(BlockNodeComponent);
