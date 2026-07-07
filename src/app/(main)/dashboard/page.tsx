"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Bot,
  TrendingUp,
  Zap,
  ShieldCheck,
  Server,
  Wallet,
  Percent,
  Coins,
  Activity,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/utils";
import { agentApi, type RankedVenueDto, type SnapshotDto } from "@/lib/agent/client";

const SUMMARY = [
  { label: "Total value routed", value: "18,420", unit: "CSPR", sub: "across 4 venues", icon: Wallet },
  { label: "Blended APY", value: "9.84%", unit: "", sub: "risk-adjusted", icon: Percent, accent: true },
  { label: "Idle capital", value: "1,240", unit: "CSPR", sub: "awaiting deployment", icon: Coins },
  { label: "Agent status", value: "Monitoring", unit: "", sub: "cycle every 15s", icon: Activity },
];

type MarketVenue = {
  id: string;
  name: string;
  apy: string;
  risk: "Low" | "Medium" | "High";
  pct: number;
  kind: string;
  tvl: string;
  executable: boolean;
};

const FALLBACK_PROTOCOLS: MarketVenue[] = [
  { id: "staking:fallback-1", name: "Casper validator staking", apy: "11.20%", risk: "Low", pct: 82, kind: "staking", tvl: "Live when connected", executable: true },
  { id: "lp:fallback-1", name: "CSPR.trade CSPR LP", apy: "8.40%", risk: "Medium", pct: 62, kind: "lp", tvl: "Reserve priced", executable: true },
  { id: "staking:fallback-2", name: "Low-fee validator", apy: "9.75%", risk: "Low", pct: 58, kind: "staking", tvl: "Live when connected", executable: true },
  { id: "lp:fallback-2", name: "CSPR.trade paired LP", apy: "6.10%", risk: "Medium", pct: 44, kind: "lp", tvl: "Reserve priced", executable: true },
];

const ACTIVITY = [
  { title: "Reallocated 420 CSPR", detail: "Friendly Market → Casper Liquid Staking (+1.45% APY)", time: "2m ago", positive: true },
  { title: "No action", detail: "Yield delta below 0.5% threshold", time: "17m ago", positive: false },
  { title: "Reallocated 900 CSPR", detail: "CasperSwap LP → Casper Liquid Staking (+2.10% APY)", time: "1h ago", positive: true },
  { title: "Held position", detail: "Best venue already at max allocation", time: "2h ago", positive: false },
];

const card = "border-black/10 bg-white rounded-2xl shadow-sm";

const barTransition = { duration: 0.9, ease: [0.22, 1, 0.36, 1] };

function formatApy(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}

function formatTvl(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "TVL pending";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M CSPR`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K CSPR`;
  return `${n.toFixed(0)} CSPR`;
}

function riskLabel(score: number): MarketVenue["risk"] {
  if (score >= 65) return "High";
  if (score >= 35) return "Medium";
  return "Low";
}

function venueFromRanked(v: RankedVenueDto, maxRiskAdjustedApy: number): MarketVenue {
  const pct = Math.max(
    8,
    Math.min(100, Math.round((v.riskAdjustedApy / Math.max(maxRiskAdjustedApy, 0.0001)) * 100))
  );
  return {
    id: v.id,
    name: v.protocol,
    apy: formatApy(v.apy),
    risk: riskLabel(v.riskScore),
    pct,
    kind: v.kind,
    tvl: formatTvl(v.tvl),
    executable:
      v.kind === "staking" ||
      (v.kind === "lp" && v.riskFlags.includes("lp_execution_session_key_saga")),
  };
}

export default function DashboardPage() {
  const [snapshot, setSnapshot] = useState<SnapshotDto | null>(null);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [marketError, setMarketError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoadingMarkets(true);
    agentApi
      .snapshot(true)
      .then((data) => {
        if (!active) return;
        setSnapshot(data);
        setMarketError(null);
      })
      .catch((e) => {
        if (!active) return;
        setMarketError(e instanceof Error ? e.message : "market snapshot unavailable");
      })
      .finally(() => {
        if (active) setLoadingMarkets(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const marketVenues = useMemo(() => {
    const ranked = snapshot?.ranked ?? [];
    if (!ranked.length) return FALLBACK_PROTOCOLS;
    const max = Math.max(...ranked.map((v) => v.riskAdjustedApy), 0.0001);
    return ranked.slice(0, 8).map((v) => venueFromRanked(v, max));
  }, [snapshot]);

  const dexVenues = useMemo(
    () => marketVenues.filter((venue) => venue.kind === "lp"),
    [marketVenues]
  );
  const bestVenue = marketVenues[0] ?? FALLBACK_PROTOCOLS[0];
  const liveVenueCount = snapshot?.count ?? marketVenues.length;
  const executableVenueCount = marketVenues.filter((venue) => venue.executable).length;
  const dexVenueCount = dexVenues.length || FALLBACK_PROTOCOLS.filter((p) => p.kind === "lp").length;

  return (
    <div className="flex flex-col gap-6 px-4 md:px-8 py-6 md:py-8 max-w-[88rem] mx-auto w-full">
      {/* Command center */}
      <Card className="overflow-hidden rounded-[1.75rem] border-transparent bg-[#241338] text-white shadow-sm">
        <CardContent className="grid gap-6 p-6 md:p-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/72">
              <LiveDot tone="light" />
              Waffle Trade · Casper testnet
            </div>
            <h1 className="max-w-3xl text-4xl font-medium tracking-tight md:text-5xl" style={{ letterSpacing: "-0.03em" }}>
              Yield routing command center
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62 md:text-base">
              Monitor live Casper staking and DEX LP venues, compare risk-adjusted yield, and hand off execution to the autonomous agent.
            </p>
            {marketError && (
              <p className="mt-3 text-xs text-amber-200">
                Live market snapshot unavailable, showing fallback venues.
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href="/dashboard/agent"
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/88"
              >
                <Bot className="size-4" />
                Open agent console
              </Link>
              <Link
                href="/dashboard/markets"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white/78 transition-colors hover:bg-white/10 hover:text-white"
              >
                View market table
                <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-white/42">Best live venue</p>
              <p className="mt-2 truncate text-xl font-medium text-white">{bestVenue.name}</p>
              <p className="mt-1 text-sm text-violet-100">{bestVenue.apy} APY · {bestVenue.risk} risk</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-white/42">Venues tracked</p>
              <p className="mt-2 text-2xl font-medium text-white">{liveVenueCount}</p>
              <p className="mt-1 text-sm text-white/55">{dexVenueCount} DEX LP markets visible</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-white/42">Executable routes</p>
              <p className="mt-2 text-2xl font-medium text-white">{executableVenueCount}</p>
              <p className="mt-1 text-sm text-white/55">staking plus CSPR.trade LPs</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Portfolio snapshot */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SUMMARY.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.label}
              className={cn(
                "rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-md",
                item.accent ? "border-transparent bg-[#2B2644] shadow-sm" : "border-black/10 bg-white shadow-sm"
              )}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className={cn("text-sm", item.accent ? "text-white/60" : "text-black/50")}>{item.label}</p>
                  <span
                    className={cn(
                      "flex size-8 items-center justify-center rounded-lg",
                      item.accent ? "bg-white/10 text-white" : "bg-black/[0.04] text-black/60"
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                </div>
                <p className={cn("mt-3 text-2xl font-medium tracking-tight", item.accent ? "text-white" : "text-black")}>
                  {item.label === "Agent status" && (
                    <span className="mr-2 inline-flex align-middle">
                      <LiveDot />
                    </span>
                  )}
                  {item.value}
                  {item.unit && <span className={cn("ml-1 text-base font-normal", item.accent ? "text-white/60" : "text-black/40")}>{item.unit}</span>}
                </p>
                <p className={cn("mt-1 text-xs", item.accent ? "text-white/50" : "text-black/50")}>{item.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Priority signal */}
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className={cn(card, "overflow-hidden")}>
          <CardContent className="p-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-black/42">Top opportunity</p>
                <h2 className="mt-2 text-2xl font-medium text-black">{bestVenue.name}</h2>
                <p className="mt-1 text-sm text-black/52">
                  Highest current risk-adjusted venue from the LP-inclusive market snapshot.
                </p>
              </div>
              <div className="rounded-2xl bg-violet-50 px-5 py-4 text-right">
                <p className="text-xs text-black/45">Advertised APY</p>
                <p className="mt-1 text-3xl font-medium text-violet-700">{bestVenue.apy}</p>
                <p className="mt-1 text-sm font-medium text-violet-950/75">{bestVenue.risk} risk · {bestVenue.tvl}</p>
              </div>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/5">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#DDD6FE]"
                initial={{ width: 0 }}
                animate={{ width: `${bestVenue.pct}%` }}
                transition={barTransition}
              />
            </div>
          </CardContent>
        </Card>

        <Card className={card}>
          <CardContent className="grid gap-3 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-black">Live market state</p>
                <p className="text-sm text-black/50">Snapshot, routing, and safety posture.</p>
              </div>
              {loadingMarkets ? (
                <RefreshCw className="size-4 animate-spin text-black/35" />
              ) : (
                <LiveDot />
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <MiniStat label="Venues" value={String(liveVenueCount)} />
              <MiniStat label="DEX LPs" value={String(dexVenueCount)} />
              <MiniStat label="Routes" value={String(executableVenueCount)} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Protocols + activity */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-black/40">Market intelligence</p>
          <h2 className="text-2xl font-medium text-black">Ranked venues and decisions</h2>
        </div>
        <span className="text-xs text-black/40">Use the agent console to approve or execute moves.</span>
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Casper DeFi protocols */}
        <Card className={cn(card, "lg:col-span-3")}>
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
              <h3 className="text-sm font-medium text-black flex items-center gap-2">
                <TrendingUp className="size-4" />
                Casper DeFi venues
              </h3>
              <span className="inline-flex items-center gap-1 text-xs text-black/40">
                {loadingMarkets && <RefreshCw className="size-3 animate-spin" />}
                {snapshot ? `${snapshot.count} live venues` : "Ranked by risk-adjusted APY"}
              </span>
            </div>
            <div className="divide-y divide-black/5">
              {marketVenues.map((p, i) => (
                <div key={p.name} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-black/[0.02]">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-xs font-medium text-black/60">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-black truncate">{p.name}</p>
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-medium uppercase",
                        p.kind === "lp" ? "bg-violet-500/10 text-violet-700" : "bg-black/[0.04] text-black/50"
                      )}>
                        {p.kind === "lp" ? "DEX LP" : p.kind}
                      </span>
                      {p.executable && (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          executable
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-black/42">{p.tvl}</p>
                    <div className="mt-2 h-1.5 w-full max-w-sm rounded-full bg-black/5 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#C4B5FD]"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${p.pct}%` }}
                        viewport={{ once: true, amount: 0.7 }}
                        transition={{ ...barTransition, delay: i * 0.04 }}
                      />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-medium text-violet-700">{p.apy}</p>
                    <p className="text-xs text-black/40">
                      <span className={cn("inline-block size-1.5 rounded-full mr-1 align-middle", p.risk === "Low" ? "bg-violet-500" : "bg-amber-500")} />
                      {p.risk} · {p.pct}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Agent activity */}
        <Card className={cn(card, "lg:col-span-2")}>
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
              <h3 className="text-sm font-medium text-black flex items-center gap-2">
                <Zap className="size-4" />
                Recent decisions
              </h3>
              <Link href="/dashboard/agent" className="text-xs text-black/50 hover:text-black inline-flex items-center gap-1">
                View all <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-black/5">
              {ACTIVITY.map((a, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-black/[0.02]">
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", a.positive ? "bg-violet-500" : "bg-black/20")} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-black">{a.title}</p>
                    <p className="text-xs text-black/50">{a.detail}</p>
                  </div>
                  <span className="shrink-0 text-xs text-black/40">{a.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DEX markets */}
      <Card className={card}>
        <CardContent className="p-0">
          <div className="flex flex-col gap-1 border-b border-black/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-medium text-black flex items-center gap-2">
              <Coins className="size-4" />
              DEX / LP markets
            </h3>
            <span className="text-xs text-black/40">
              CSPR.trade pools discovered from live reserves
            </span>
          </div>
          <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
            {(dexVenues.length ? dexVenues : FALLBACK_PROTOCOLS.filter((p) => p.kind === "lp")).map((pool) => (
              <div key={pool.id} className="rounded-2xl border border-violet-500/10 bg-violet-50/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-black">{pool.name}</p>
                    <p className="mt-1 text-xs text-black/45">{pool.tvl}</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-violet-700">
                    DEX LP
                  </span>
                </div>
                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-black/45">APY</p>
                    <p className="text-2xl font-medium text-violet-700">{pool.apy}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-black/45">Risk</p>
                    <p className="text-sm font-medium text-black">{pool.risk}</p>
                  </div>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#DDD6FE]"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${pool.pct}%` }}
                    viewport={{ once: true, amount: 0.7 }}
                    transition={barTransition}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* MCP + guardrails strip */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="rounded-2xl border-transparent bg-[#2B2644] shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <Server className="size-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-white">MCP layer connected</p>
              <p className="text-sm text-white/60">
                <span className="mr-2 inline-flex align-middle"><LiveDot tone="light" /></span>
                12/12 tools exposing Casper contract state to the LLM.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className={card}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
              <ShieldCheck className="size-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium text-black">Guardrails active</p>
              <p className="text-sm text-black/50">
                <span className="mr-2 inline-flex align-middle"><LiveDot /></span>
                Auto-sign limit, per-venue caps and emergency stop enforced.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/[0.03] px-3 py-2">
      <p className="text-[11px] text-black/40">{label}</p>
      <p className="mt-1 text-lg font-medium text-black">{value}</p>
    </div>
  );
}

function LiveDot({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const color = tone === "light" ? "bg-violet-300" : "bg-violet-500";

  return (
    <span className="relative inline-flex size-2.5">
      <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-55", color)} />
      <span className={cn("relative inline-flex size-2.5 rounded-full", color)} />
    </span>
  );
}
