"use client";

import { memo, useState } from "react";
import { Handle, type Node, type NodeProps, Position, useReactFlow } from "@xyflow/react";
import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Brain,
  BrainCircuit,
  Cloud,
  Coins,
  Cpu,
  FileText,
  FlaskConical,
  Gem,
  KeyRound,
  Network,
  Pencil,
  Plug,
  Shield,
  Sparkles,
  UserCheck,
  Zap,
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
import type { AgentBlockCategory } from "@/lib/studio/agent-blocks";
import {
  CASPER_CLOUD_MCP_TOOLS,
  LLM_MODELS,
  WAFFLE_MCP_TOOLS,
  getAgentBlockById,
} from "@/lib/studio/agent-blocks";
import { LlmProviderLogo, type LlmLogoId } from "@/components/studio/llm-provider-logos";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  BrainCircuit,
  Sparkles,
  Cpu,
  Gem,
  Zap,
  Cloud,
  Network,
  Plug,
  FileText,
  BookOpen,
  Activity,
  BarChart3,
  Shield,
  Brain,
  UserCheck,
  FlaskConical,
  KeyRound,
  ArrowLeftRight,
  Coins,
};

export type AgentBlockParams = {
  llmModel?: string;
  temperature?: string;
  systemPrompt?: string;
  mcpServerId?: string;
  mcpTools?: string[];
  mcpUrl?: string;
  skillName?: string;
  skillUrl?: string;
  intervalSec?: string;
  maxSlippage?: string;
  minApyDelta?: string;
  executionMode?: "dry_run" | "live";
  signingPath?: "x402" | "human_approval" | "session_key";
  x402Scope?: string;
  notes?: string;
};

export type AgentBlockNodeData = {
  label: string;
  category: AgentBlockCategory;
  iconName?: string;
  logoId?: LlmLogoId;
  blockId?: string;
  params?: AgentBlockParams;
  borderColor?: string;
  bgColor?: string;
  color?: string;
};

type AgentFlowNode = Node<AgentBlockNodeData>;

function displayLabel(data: AgentBlockNodeData): string {
  const p = data.params;
  if (data.category === "llm" && p?.llmModel) return `${data.label} · ${p.llmModel}`;
  if (data.category === "skill" && p?.skillName) return p.skillName;
  if (data.category === "mcp" && p?.mcpTools?.length) {
    return `${data.label} (${p.mcpTools.length} tools)`;
  }
  return data.label;
}

function AgentBlockNodeComponent({ id, data }: NodeProps<AgentFlowNode>) {
  const { setNodes } = useReactFlow<AgentFlowNode>();
  const [open, setOpen] = useState(false);
  const block = data.blockId ? getAgentBlockById(data.blockId) : undefined;
  const Icon = (data.iconName && ICON_MAP[data.iconName]) || BrainCircuit;
  const logoId = data.logoId ?? block?.logoId;
  const params = data.params ?? {};
  const border = data.borderColor ?? block?.borderColor ?? "border-black/10";
  const bg = data.bgColor ?? block?.bgColor ?? "bg-white";
  const iconColor = data.color ?? block?.color ?? "text-[#6D28D9]";

  const updateData = (next: Partial<AgentBlockNodeData>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...next } } : n))
    );
  };

  const saveParams = (nextParams: AgentBlockParams) => {
    updateData({ params: { ...params, ...nextParams } });
    setOpen(false);
  };

  return (
    <div
      className={`min-w-[200px] rounded-2xl border-2 bg-white p-4 shadow-sm ${border}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-black/15 !bg-white"
      />
      <div className="flex items-center gap-2">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${bg} p-1.5`}>
          {logoId ? (
            <LlmProviderLogo id={logoId} className="size-5" />
          ) : (
            <Icon className={`size-5 ${iconColor}`} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-black">{displayLabel(data)}</p>
          <p className="text-xs capitalize text-black/45">{data.category}</p>
        </div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 rounded-lg text-black/40 hover:bg-black/5 hover:text-black"
              onClick={(e) => e.stopPropagation()}
            >
              <Pencil className="size-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-80 rounded-2xl border border-black/10 bg-white text-black shadow-lg"
            align="end"
            side="right"
            onClick={(e) => e.stopPropagation()}
          >
            <AgentBlockEditForm
              blockId={data.blockId ?? ""}
              category={data.category}
              params={params}
              onSave={saveParams}
              onCancel={() => setOpen(false)}
            />
          </PopoverContent>
        </Popover>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-black/15 !bg-white"
      />
    </div>
  );
}

function AgentBlockEditForm({
  blockId,
  category,
  params,
  onSave,
  onCancel,
}: {
  blockId: string;
  category: AgentBlockCategory;
  params: AgentBlockParams;
  onSave: (p: AgentBlockParams) => void;
  onCancel: () => void;
}) {
  const [llmModel, setLlmModel] = useState(params.llmModel ?? "");
  const [temperature, setTemperature] = useState(params.temperature ?? "0.2");
  const [systemPrompt, setSystemPrompt] = useState(params.systemPrompt ?? "");
  const [mcpUrl, setMcpUrl] = useState(params.mcpUrl ?? "");
  const [mcpTools, setMcpTools] = useState(params.mcpTools?.join(", ") ?? "");
  const [skillName, setSkillName] = useState(params.skillName ?? "");
  const [skillUrl, setSkillUrl] = useState(
    params.skillUrl ?? (blockId === "skill-cspr-cloud" ? "https://cspr.cloud/skill.md" : "")
  );
  const [intervalSec, setIntervalSec] = useState(params.intervalSec ?? "60");
  const [minApyDelta, setMinApyDelta] = useState(params.minApyDelta ?? "0.5");
  const [x402Scope, setX402Scope] = useState(params.x402Scope ?? "rebalance");
  const [notes, setNotes] = useState(params.notes ?? "");

  const models = LLM_MODELS[blockId] ?? [];
  const toolOptions =
    blockId === "mcp-casper-cloud"
      ? CASPER_CLOUD_MCP_TOOLS
      : blockId === "mcp-waffle-yield"
        ? WAFFLE_MCP_TOOLS
        : [];

  const handleSave = () => {
    const next: AgentBlockParams = { ...params, notes: notes.trim() || undefined };
    if (category === "llm") {
      next.llmModel = llmModel || models[0];
      next.temperature = temperature;
      next.systemPrompt = systemPrompt.trim() || undefined;
    }
    if (category === "mcp") {
      next.mcpUrl = mcpUrl.trim() || undefined;
      next.mcpTools = mcpTools
        ? mcpTools.split(",").map((t) => t.trim()).filter(Boolean)
        : undefined;
    }
    if (category === "skill") {
      next.skillName = skillName.trim() || undefined;
      next.skillUrl = skillUrl.trim() || undefined;
    }
    if (blockId === "logic-monitor") next.intervalSec = intervalSec;
    if (blockId === "logic-rank") next.minApyDelta = minApyDelta;
    if (blockId === "exec-x402") next.x402Scope = x402Scope;
    onSave(next);
  };

  const inputClass =
    "mt-1 border-black/10 bg-white text-black placeholder:text-black/35 focus-visible:ring-violet-200";
  const labelClass = "text-black/55";

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-black">Configure block</p>
      <div className="space-y-3">
        {category === "llm" && (
          <>
            <div>
              <Label className={labelClass}>Model</Label>
              <Select value={llmModel || models[0]} onValueChange={setLlmModel}>
                <SelectTrigger className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-black/10 bg-white">
                  {models.map((m) => (
                    <SelectItem key={m} value={m} className="text-black focus:bg-violet-50">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className={labelClass}>Temperature</Label>
              <Input value={temperature} onChange={(e) => setTemperature(e.target.value)} className={inputClass} />
            </div>
            <div>
              <Label className={labelClass}>System prompt</Label>
              <Input
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Optional agent instructions"
                className={inputClass}
              />
            </div>
          </>
        )}
        {category === "mcp" && (
          <>
            {blockId === "mcp-custom" && (
              <div>
                <Label className={labelClass}>MCP server URL</Label>
                <Input
                  value={mcpUrl}
                  onChange={(e) => setMcpUrl(e.target.value)}
                  placeholder="https://..."
                  className={inputClass}
                />
              </div>
            )}
            {toolOptions.length > 0 && (
              <div>
                <Label className={labelClass}>Tools (comma-separated)</Label>
                <Input
                  value={mcpTools}
                  onChange={(e) => setMcpTools(e.target.value)}
                  placeholder={toolOptions.slice(0, 3).join(", ") + "..."}
                  className={inputClass}
                />
              </div>
            )}
          </>
        )}
        {category === "skill" && (
          <>
            <div>
              <Label className={labelClass}>Skill name</Label>
              <Input
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                placeholder="e.g. Casper yield playbook"
                className={inputClass}
              />
            </div>
            <div>
              <Label className={labelClass}>Skill.md URL</Label>
              <Input
                value={skillUrl}
                onChange={(e) => setSkillUrl(e.target.value)}
                placeholder="https://..."
                className={inputClass}
              />
            </div>
          </>
        )}
        {blockId === "logic-monitor" && (
          <div>
            <Label className={labelClass}>Poll interval (seconds)</Label>
            <Input value={intervalSec} onChange={(e) => setIntervalSec(e.target.value)} className={inputClass} />
          </div>
        )}
        {blockId === "logic-rank" && (
          <div>
            <Label className={labelClass}>Min APY delta (%)</Label>
            <Input value={minApyDelta} onChange={(e) => setMinApyDelta(e.target.value)} className={inputClass} />
          </div>
        )}
        {blockId === "exec-x402" && (
          <div>
            <Label className={labelClass}>X402 grant scope</Label>
            <Select value={x402Scope} onValueChange={setX402Scope}>
              <SelectTrigger className={inputClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-black/10 bg-white">
                <SelectItem value="rebalance" className="text-black focus:bg-violet-50">Rebalance only</SelectItem>
                <SelectItem value="lp" className="text-black focus:bg-violet-50">LP moves</SelectItem>
                <SelectItem value="full" className="text-black focus:bg-violet-50">Full agent rail</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <Label className={labelClass}>Notes</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
            className={inputClass}
          />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <Button
          size="sm"
          className="flex-1 rounded-full bg-black text-white hover:bg-black/85"
          onClick={handleSave}
        >
          Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="rounded-full border-black/10"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

export const AgentBlockNode = memo(AgentBlockNodeComponent);
