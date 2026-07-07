import Link from "next/link";
import {
  BrainCircuit,
  FlaskConical,
  GitBranch,
  KeyRound,
  Layers,
  Play,
  Rocket,
  ShieldCheck,
  Sparkles,
  Wrench,
  ArrowRight,
  Plus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";
import { listStudioAgents } from "@/lib/studio/store";

const CARD = "rounded-2xl border border-black/10 bg-white shadow-sm";

const CAPABILITIES = [
  {
    title: "Custom LLM stacks",
    text: "Choose the reasoning model, prompting style, memory, and approval logic that powers each agent.",
    icon: BrainCircuit,
  },
  {
    title: "Bring your own MCPs",
    text: "Wire protocol-specific MCP servers into the studio so each agent can read structured DeFi state directly.",
    icon: Wrench,
  },
  {
    title: "Skill.md behavior packs",
    text: "Compose reusable skills to define how an agent researches, reasons, routes capital, and handles edge cases.",
    icon: Sparkles,
  },
  {
    title: "Simulate before execution",
    text: "Preview actions, approvals, and outcomes in a dry-run environment before promoting an agent to live mode.",
    icon: FlaskConical,
  },
];

const PIPELINE = [
  {
    title: "Compose your agent stack",
    text: "Open the Agent Composer and drag in the blocks you need — OpenAI, Claude, Deepseek, Gemini, or Grok for reasoning, Casper Cloud MCP or Waffle Yield Router for live DeFi data, and Skill.md playbooks for protocol-specific behavior.",
    icon: Layers,
  },
  {
    title: "Wire the autonomy loop",
    text: "Connect monitor → rank → policy → LLM verdict → execution on the canvas. You define how the agent reads yields, applies guardrails, gets a model review, and chooses when to move capital.",
    icon: GitBranch,
  },
  {
    title: "Simulate before you ship",
    text: "Run a full dry-run through your flow with no on-chain transactions. Inspect each step, validate MCP tool calls, and tune cooldowns, APY thresholds, and approval rules before going live.",
    icon: FlaskConical,
  },
  {
    title: "Deploy to Casper markets",
    text: "Promote the agent with X402 delegated signing or human wallet approval. Execution routes through Waffle’s MCP layer so your custom stack can rebalance, stake, or manage LP on testnet.",
    icon: KeyRound,
  },
];

const STUDIO_MODULES = [
  {
    title: "Agent Composer",
    text: "Visual canvas to design custom DeFi agents — drag LLM, MCP, Skill.md, logic, and execution blocks, then save and iterate.",
    href: "/dashboard/studio/new",
  },
  {
    title: "Casper Cloud MCP",
    text: "Plug into hosted CSPR.cloud reads plus Waffle’s 12-tool yield router for snapshots, rebalances, and LP moves.",
  },
  {
    title: "Simulation Lab",
    text: "Replay your agent graph in dry-run mode and see exactly what would happen before a single CSPR transaction is sent.",
  },
  {
    title: "X402 Execution Console",
    text: "Ship agents with scoped auto-signing via the CSPR x402 facilitator, or keep larger moves behind Casper Wallet approval.",
  },
];

export default async function StudioPage() {
  const agents = await listStudioAgents();

  return (
    <div className="mx-auto flex w-full max-w-[88rem] flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <Card className="overflow-hidden rounded-[1.75rem] border-transparent bg-[#241338] text-white shadow-sm">
        <CardContent className="grid gap-6 p-6 md:p-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/72">
              <span className="size-1.5 rounded-full bg-violet-300" />
              Studio · agent builder
            </div>
            <h1
              className="max-w-3xl text-4xl font-medium tracking-tight md:text-5xl"
              style={{ letterSpacing: "-0.03em" }}
            >
              Build your own DeFi agents.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/62 md:text-base">
              Studio is where Waffle Trade expands beyond a single agent. Design custom
              agents powered by your own LLMs, MCPs, Skill.md playbooks, and execution
              rails for any DeFi protocol — then simulate them before going live.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                asChild
                className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black hover:bg-white/88"
              >
                <Link href="/dashboard/studio/new">
                  <Rocket className="mr-2 size-4" />
                  Create agent
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full border-white/15 bg-transparent px-5 py-2.5 text-sm font-medium text-white/78 hover:bg-white/10 hover:text-white"
              >
                <Link href="/dashboard/studio/new">
                  <Play className="mr-2 size-4" />
                  Run simulation
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <MetricCard label="Execution rail" value="X402 ready" sub="delegated Casper signing" />
            <MetricCard label="Simulation mode" value="Dry run" sub="preview before live execution" />
            <MetricCard label="Agent surface" value="Any protocol" sub="MCP + Skill.md powered" />
          </div>
        </CardContent>
      </Card>

      {agents.length > 0 && (
        <Card className={CARD}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-medium tracking-tight text-black">Your agents</h2>
                <p className="mt-1 text-sm text-black/55">
                  Open, edit, simulate, or deploy saved agent flows.
                </p>
              </div>
              <Button asChild size="sm" className="rounded-full bg-black text-white hover:bg-black/85">
                <Link href="/dashboard/studio/new">
                  <Plus className="mr-1.5 size-4" />
                  New
                </Link>
              </Button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {agents.map((agent) => (
                <Link
                  key={agent.id}
                  href={`/dashboard/studio/${agent.id}`}
                  className="group rounded-2xl border border-black/8 bg-black/[0.02] p-4 transition-all hover:border-violet-200 hover:bg-violet-50/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-black group-hover:text-violet-900">
                      {agent.name}
                    </p>
                    <StatusBadge status={agent.status} />
                  </div>
                  <p className="mt-2 text-xs text-black/50">
                    {agent.llmProvider ? `${agent.llmProvider} · ` : ""}
                    {agent.nodes.length} blocks · {agent.edges.length} connections
                  </p>
                  {agent.executionRail && (
                    <p className="mt-1 text-xs text-violet-700">Rail: {agent.executionRail}</p>
                  )}
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-black/45 group-hover:text-violet-700">
                    Open composer
                    <ArrowRight className="size-3" />
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {CAPABILITIES.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className={cn(CARD, "transition-all hover:-translate-y-0.5 hover:shadow-md")}>
              <CardContent className="p-5">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-violet-50 text-[#6D28D9]">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 text-lg font-medium tracking-tight text-black">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-black/65">{item.text}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className={CARD}>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-[#6D28D9]" />
              <div>
                <h2 className="text-xl font-medium tracking-tight text-black">How Studio works</h2>
                <p className="mt-1 text-sm text-black/55">
                  From blank canvas to live agent in four steps.
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {PIPELINE.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.title}
                    className="flex items-start gap-3 rounded-2xl border border-black/8 bg-violet-50/35 px-4 py-4"
                  >
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-black text-xs font-medium text-white">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Icon className="size-4 shrink-0 text-[#6D28D9]" />
                        <p className="text-sm font-medium text-black">{step.title}</p>
                      </div>
                      <p className="mt-1.5 text-sm leading-6 text-black/65">{step.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5">
              <Link
                href="/dashboard/studio/new"
                className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black/85"
              >
                <Rocket className="size-4" />
                Start building
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className={CARD}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-medium tracking-tight text-black">Studio modules</h2>
                <p className="mt-1 text-sm text-black/55">
                  Visual build surface for strategy teams, protocol ops, and agent designers.
                </p>
              </div>
              <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                Live
              </Badge>
            </div>

            <div className="mt-5 grid gap-3">
              {STUDIO_MODULES.map((mod) => (
                <StudioRow key={mod.title} title={mod.title} text={mod.text} href={mod.href} />
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href="/dashboard/agent"
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black/70 transition-colors hover:bg-black/5 hover:text-black"
              >
                Open current agent
              </Link>
              <Link
                href="/dashboard/markets"
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black/70 transition-colors hover:bg-black/5 hover:text-black"
              >
                Use market context
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-black/5 text-black/55",
    simulated: "bg-amber-50 text-amber-700",
    deployed: "bg-emerald-50 text-emerald-700",
    archived: "bg-black/5 text-black/40",
  };
  return (
    <Badge className={cn("border-0 text-[10px] uppercase tracking-wide", styles[status] ?? styles.draft)}>
      {status}
    </Badge>
  );
}

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-white/42">{label}</p>
      <p className="mt-2 text-2xl font-medium text-white">{value}</p>
      <p className="mt-1 text-sm text-white/55">{sub}</p>
    </div>
  );
}

function StudioRow({
  title,
  text,
  href,
}: {
  title: string;
  text: string;
  href?: string;
}) {
  const inner = (
    <div className="rounded-2xl border border-black/8 bg-black/[0.02] px-4 py-3 transition-colors hover:border-violet-200 hover:bg-violet-50/30">
      <p className="text-sm font-medium text-black">{title}</p>
      <p className="mt-1 text-sm leading-6 text-black/65">{text}</p>
    </div>
  );
  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}
