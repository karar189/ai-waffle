"use client";

import "@xyflow/react/dist/style.css";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Controls,
  Panel,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";
import {
  Activity,
  ArrowLeft,
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Brain,
  BrainCircuit,
  ChevronDown,
  Cloud,
  Coins,
  Cpu,
  FileText,
  FlaskConical,
  Gem,
  KeyRound,
  Network,
  PanelLeft,
  PanelLeftClose,
  Play,
  Plug,
  Rocket,
  Save,
  Shield,
  Sparkles,
  UserCheck,
  Wrench,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AgentBlockNode, type AgentBlockNodeData } from "@/components/studio/agent-block-node";
import {
  AGENT_BLOCKS,
  CATEGORY_LABELS,
  type AgentBlock,
  type AgentBlockCategory,
} from "@/lib/studio/agent-blocks";
import type { StudioAgentDefinition } from "@/lib/studio/types";
import { LlmProviderLogo } from "@/components/studio/llm-provider-logos";
import { cn } from "@/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: NodeTypes = { agentBlock: AgentBlockNode as any };

const DRAG_MIME = "application/waffle-agent-block";

function getIcon(iconName: string) {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
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
    Wrench,
  };
  return icons[iconName] ?? BrainCircuit;
}

function mapToolbarToCategory(id: string): AgentBlockCategory {
  switch (id) {
    case "llm":
      return "llm";
    case "mcp":
      return "mcp";
    case "skill":
      return "skill";
    case "logic":
      return "logic";
    case "execution":
      return "execution";
    default:
      return "llm";
  }
}

function FlowCanvasInner({
  nodes,
  setNodes,
  edges,
  setEdges,
  onToolbarClick,
}: {
  nodes: Node<AgentBlockNodeData>[];
  setNodes: React.Dispatch<React.SetStateAction<Node<AgentBlockNodeData>[]>>;
  edges: Edge[];
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  onToolbarClick?: (cat: AgentBlockCategory) => void;
}) {
  const reactFlow = useReactFlow();

  const onNodesChange: OnNodesChange = useCallback(
    (changes) =>
      setNodes((nds) => applyNodeChanges(changes, nds) as Node<AgentBlockNodeData>[]),
    [setNodes]
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );
  const onConnect: OnConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData(DRAG_MIME);
      if (!raw) return;
      const block = JSON.parse(raw) as AgentBlock;
      const position = reactFlow.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const newNode: Node<AgentBlockNodeData> = {
        id: `${block.id}-${Date.now()}`,
        type: "agentBlock",
        position,
        data: {
          label: block.label,
          category: block.category,
          iconName: block.iconName,
          logoId: block.logoId,
          blockId: block.id,
          borderColor: block.borderColor,
          bgColor: block.bgColor,
          color: block.color,
          params:
            block.category === "llm"
              ? { llmModel: undefined, temperature: "0.2" }
              : block.id === "skill-cspr-cloud"
                ? { skillUrl: "https://cspr.cloud/skill.md", skillName: "CSPR.cloud" }
                : undefined,
        },
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlow, setNodes]
  );

  const [activeTool, setActiveTool] = useState("llm");

  const toolbarTools = [
    { id: "llm", Icon: BrainCircuit, label: "LLM providers" },
    { id: "mcp", Icon: Network, label: "MCP servers" },
    { id: "skill", Icon: FileText, label: "Skill.md packs" },
    { id: "logic", Icon: Shield, label: "Agent logic" },
    { id: "execution", Icon: KeyRound, label: "Execution rails" },
  ];

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView
        className="bg-[#F7F2FF]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
        defaultEdgeOptions={{
          style: { stroke: "rgba(109,40,217,0.28)" },
          type: "smoothstep",
        }}
        connectionLineStyle={{ stroke: "rgba(109,40,217,0.45)" }}
      >
        <Controls
          className="!rounded-xl !border !border-black/10 !bg-white/90 !shadow-sm [&>button]:!rounded-lg [&>button]:!border-0 [&>button]:!bg-transparent [&>button]:!text-black/60 [&>button:hover]:!bg-black/5 [&>button:hover]:!text-black"
          position="top-right"
          showInteractive={false}
        />
        <Panel position="bottom-center" className="!m-0 !mb-5 !left-1/2 !-translate-x-1/2">
          <div className="flex items-center gap-1 rounded-2xl border border-black/10 bg-white/90 px-3 py-2.5 shadow-sm backdrop-blur-xl">
            {toolbarTools.map(({ id, Icon, label }) => (
              <div key={id} className="group/tooltip relative flex">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTool(id);
                    onToolbarClick?.(mapToolbarToCategory(id));
                  }}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl transition-colors",
                    activeTool === id
                      ? "bg-black text-white"
                      : "text-black/45 hover:bg-black/5 hover:text-black"
                  )}
                  aria-label={label}
                >
                  <Icon className="size-5" />
                </button>
                <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-xl border border-black/10 bg-white px-2.5 py-1.5 text-xs font-medium text-black opacity-0 shadow-sm transition-opacity group-hover/tooltip:opacity-100">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export interface AgentComposerProps {
  agentId?: string;
  initialAgent?: StudioAgentDefinition | null;
}

function AgentComposerContent({ agentId, initialAgent }: AgentComposerProps) {
  const router = useRouter();
  const [agentName, setAgentName] = useState(initialAgent?.name ?? "Untitled agent");
  const [nodes, setNodes] = useState<Node<AgentBlockNodeData>[]>(initialAgent?.nodes ?? []);
  const [edges, setEdges] = useState<Edge[]>(initialAgent?.edges ?? []);
  const [savedAgents, setSavedAgents] = useState<StudioAgentDefinition[]>([]);
  const [saving, setSaving] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [showSimulateConfirm, setShowSimulateConfirm] = useState(false);
  const [showDeployConfirm, setShowDeployConfirm] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [expanded, setExpanded] = useState<Record<AgentBlockCategory, boolean>>({
    llm: true,
    mcp: false,
    skill: false,
    logic: false,
    execution: false,
  });
  const [highlight, setHighlight] = useState<AgentBlockCategory | null>(null);
  const sectionRefs = useRef<Record<AgentBlockCategory, HTMLDivElement | null>>({
    llm: null,
    mcp: null,
    skill: null,
    logic: null,
    execution: null,
  });

  const currentId = agentId ?? initialAgent?.id;

  useEffect(() => {
    fetch("/api/studio/agents")
      .then((r) => r.json())
      .then((data) => setSavedAgents(data.agents ?? []))
      .catch(() => {});
  }, [currentId]);

  const openCategory = useCallback((cat: AgentBlockCategory) => {
    setLeftPanelOpen(true);
    setExpanded((prev) => ({ ...prev, [cat]: true }));
    setHighlight(cat);
    setTimeout(() => {
      sectionRefs.current[cat]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      setTimeout(() => setHighlight(null), 900);
    }, 120);
  }, []);

  const handleDragStart = (e: React.DragEvent, block: AgentBlock) => {
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify(block));
    e.dataTransfer.effectAllowed = "move";
  };

  const saveAgent = async (): Promise<string | undefined> => {
    setSaving(true);
    try {
      const body = { name: agentName, nodes, edges };
      const res = await fetch(
        currentId ? `/api/studio/agents/${currentId}` : "/api/studio/agents",
        {
          method: currentId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      toast.success("Agent saved");
      if (!currentId && data.agent?.id) {
        router.replace(`/dashboard/studio/${data.agent.id}`);
        return data.agent.id as string;
      }
      return currentId;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
      return undefined;
    } finally {
      setSaving(false);
    }
  };

  const runSimulation = async () => {
    setShowSimulateConfirm(false);
    setSimulating(true);
    try {
      let id = currentId;
      if (!id) id = await saveAgent();
      if (!id) return;
      const res = await fetch(`/api/studio/agents/${id}/simulate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Simulation failed");
      toast.success(data.message ?? "Simulation complete");
      if (data.steps?.length) {
        toast.message(
          data.steps.map((s: { label: string; detail?: string }) => `${s.label}: ${s.detail}`).join("\n"),
          { duration: 8000 }
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Simulation failed");
    } finally {
      setSimulating(false);
    }
  };

  const deployAgent = async () => {
    setShowDeployConfirm(false);
    setDeploying(true);
    try {
      let id = currentId;
      if (!id) id = await saveAgent();
      if (!id) return;
      const res = await fetch(`/api/studio/agents/${id}/deploy`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Deploy failed");
      toast.success(data.message ?? "Agent deployed");
      router.push("/dashboard/agent");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Deploy failed");
    } finally {
      setDeploying(false);
    }
  };

  const categories = Object.keys(CATEGORY_LABELS) as AgentBlockCategory[];

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] flex-col bg-[#F5F5F5] text-black min-w-0">
      <div className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-black/10 bg-white px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 rounded-full px-2.5 text-sm text-black/55 hover:bg-black/5 hover:text-black"
            asChild
          >
            <Link href="/dashboard/studio">
              <ArrowLeft className="size-4" />
              Studio
            </Link>
          </Button>
          <span className="text-black/15">|</span>
          <span className="hidden items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-medium text-[#6D28D9] sm:inline-flex">
            <span className="size-1.5 rounded-full bg-violet-400" />
            Agent composer
          </span>
          <Input
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            className="h-9 max-w-[220px] border-0 bg-transparent font-roboto text-base font-medium tracking-tight text-black focus-visible:ring-0"
          />
          <span className="hidden text-sm text-black/40 sm:inline">flow</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Select
            value={currentId ?? "__new__"}
            onValueChange={(id) => {
              if (id === "__new__") router.push("/dashboard/studio/new");
              else router.push(`/dashboard/studio/${id}`);
            }}
          >
            <SelectTrigger className="h-9 w-[150px] rounded-full border-black/10 bg-white text-sm text-black shadow-none hover:bg-black/[0.02]">
              <SelectValue placeholder="Agents" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-black/10 bg-white text-black">
              <SelectItem value="__new__" className="text-black/55 focus:bg-violet-50 focus:text-black">
                New agent
              </SelectItem>
              {savedAgents.map((a) => (
                <SelectItem key={a.id} value={a.id} className="text-black focus:bg-violet-50 focus:text-black">
                  {a.name.slice(0, 24)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-9 gap-2 rounded-full border border-black/10 bg-white px-3 text-sm font-medium text-black/70 shadow-none hover:bg-black/5 hover:text-black disabled:bg-white disabled:text-black/35"
            onClick={() => setShowSimulateConfirm(true)}
            disabled={simulating}
          >
            <Play className="size-4" />
            <span className="hidden sm:inline">Simulate</span>
          </Button>
          <Button
            size="sm"
            className="h-9 gap-2 rounded-full border border-black/10 bg-white px-3 text-sm font-medium text-black shadow-none hover:bg-black/5 disabled:bg-white disabled:text-black/35"
            onClick={() => saveAgent()}
            disabled={saving}
          >
            <Save className="size-4" />
            <span className="hidden sm:inline">Save</span>
          </Button>
          <Button
            size="sm"
            className="h-9 gap-2 rounded-full bg-black px-4 text-sm font-medium text-white shadow-none hover:bg-black/85 disabled:bg-black/50 disabled:text-white/70"
            onClick={() => setShowDeployConfirm(true)}
            disabled={deploying}
          >
            <Rocket className="size-4" />
            Deploy
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 p-3 md:p-4">
        <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
          <div
            className={cn(
              "flex shrink-0 flex-col border-r border-black/10 bg-white transition-[width] duration-150",
              leftPanelOpen ? "w-[260px]" : "w-12"
            )}
          >
            <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-black/10 px-3">
              {leftPanelOpen ? (
                <>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-black/40">
                    Blocks
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-full border border-black/10 bg-white text-black/45 shadow-none hover:bg-black/5 hover:text-black"
                    onClick={() => setLeftPanelOpen(false)}
                  >
                    <PanelLeftClose className="size-4" />
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full border border-black/10 bg-white text-black/45 shadow-none hover:bg-black/5 hover:text-black"
                  onClick={() => setLeftPanelOpen(true)}
                >
                  <PanelLeft className="size-4" />
                </Button>
              )}
            </div>
            {leftPanelOpen && (
              <div className="flex-1 overflow-auto px-2.5 py-3">
                {categories.map((cat) => (
                  <div
                    key={cat}
                    ref={(el) => {
                      sectionRefs.current[cat] = el;
                    }}
                    className="mb-2"
                  >
                    <button
                      type="button"
                      onClick={() => setExpanded((p) => ({ ...p, [cat]: !p[cat] }))}
                      className="flex w-full items-center justify-between rounded-xl px-2.5 py-2.5 text-left text-[13px] font-medium text-black hover:bg-black/[0.03]"
                    >
                      <span className={cn(highlight === cat && "text-[#6D28D9]")}>
                        {CATEGORY_LABELS[cat]}
                      </span>
                      <ChevronDown
                        className={cn(
                          "size-4 text-black/35 transition-transform",
                          expanded[cat] && "rotate-180"
                        )}
                      />
                    </button>
                    {expanded[cat] && (
                      <div className="space-y-2 pb-2">
                        {AGENT_BLOCKS.filter((b) => b.category === cat).map((block) => {
                          const Icon = getIcon(block.iconName);
                          return (
                            <div
                              key={block.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, block)}
                              className="cursor-grab rounded-xl border border-black/8 bg-white px-3 py-3 shadow-sm transition-all hover:border-violet-200 hover:bg-violet-50/50 active:cursor-grabbing"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    "flex size-9 shrink-0 items-center justify-center rounded-xl border border-black/5 p-1.5",
                                    block.bgColor
                                  )}
                                >
                                  {block.logoId ? (
                                    <LlmProviderLogo id={block.logoId} className="size-5" />
                                  ) : (
                                    <Icon className={cn("size-4", block.color)} />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-black">{block.label}</p>
                                  <p className="text-[11px] leading-snug text-black/50">
                                    {block.description}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="min-h-0 min-w-0 flex-1 bg-[#F7F2FF]">
            <FlowCanvasInner
              nodes={nodes}
              setNodes={setNodes}
              edges={edges}
              setEdges={setEdges}
              onToolbarClick={openCategory}
            />
          </div>
        </div>
      </div>

      <AlertDialog open={showSimulateConfirm} onOpenChange={setShowSimulateConfirm}>
        <AlertDialogContent className="rounded-2xl border-black/10 bg-white text-black">
          <AlertDialogHeader>
            <AlertDialogTitle>Run simulation?</AlertDialogTitle>
            <AlertDialogDescription className="text-black/55">
              Walks your agent flow in dry-run mode. No on-chain transactions will be sent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full border border-black/10 bg-white text-black hover:bg-black/5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-black text-white hover:bg-black/85"
              onClick={runSimulation}
            >
              Simulate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeployConfirm} onOpenChange={setShowDeployConfirm}>
        <AlertDialogContent className="rounded-2xl border-black/10 bg-white text-black">
          <AlertDialogHeader>
            <AlertDialogTitle>Deploy agent?</AlertDialogTitle>
            <AlertDialogDescription className="text-black/55">
              Promotes this flow to a live agent. Execution uses your configured rail (X402 or
              human approval) and MCP tools on Casper testnet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full border border-black/10 bg-white text-black hover:bg-black/5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-black text-white hover:bg-black/85"
              onClick={deployAgent}
            >
              Deploy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function AgentComposer(props: AgentComposerProps) {
  return (
    <ReactFlowProvider>
      <AgentComposerContent {...props} />
    </ReactFlowProvider>
  );
}
