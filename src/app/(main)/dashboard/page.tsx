"use client";

import Link from "next/link";
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
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/utils";

const SUMMARY = [
  { label: "Total value routed", value: "18,420", unit: "CSPR", sub: "across 4 venues", icon: Wallet },
  { label: "Blended APY", value: "9.84%", unit: "", sub: "risk-adjusted", icon: Percent, accent: true },
  { label: "Idle capital", value: "1,240", unit: "CSPR", sub: "awaiting deployment", icon: Coins },
  { label: "Agent status", value: "Monitoring", unit: "", sub: "cycle every 15s", icon: Activity },
];

const PROTOCOLS = [
  { name: "Casper Liquid Staking", apy: "11.20%", risk: "Low", pct: 42 },
  { name: "Friendly Market", apy: "9.75%", risk: "Low", pct: 26 },
  { name: "CasperSwap LP", apy: "8.40%", risk: "Medium", pct: 20 },
  { name: "Tapecaster Vault", apy: "6.10%", risk: "Medium", pct: 12 },
];

const ACTIVITY = [
  { title: "Reallocated 420 CSPR", detail: "Friendly Market → Casper Liquid Staking (+1.45% APY)", time: "2m ago", positive: true },
  { title: "No action", detail: "Yield delta below 0.5% threshold", time: "17m ago", positive: false },
  { title: "Reallocated 900 CSPR", detail: "CasperSwap LP → Casper Liquid Staking (+2.10% APY)", time: "1h ago", positive: true },
  { title: "Held position", detail: "Best venue already at max allocation", time: "2h ago", positive: false },
];

const card = "border-black/10 bg-white rounded-2xl shadow-sm";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 px-4 md:px-8 py-6 md:py-8 max-w-[88rem] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-black/60">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Autonomous · Casper testnet
          </div>
          <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-black" style={{ letterSpacing: "-0.03em" }}>
            Yield overview
          </h1>
          <p className="mt-1.5 text-sm text-black/60 max-w-lg">
            Autonomous yield-routing across Casper DeFi protocols, orchestrated over MCP.
          </p>
        </div>
        <Link
          href="/dashboard/agent"
          className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors w-fit"
        >
          <Bot className="size-4" />
          Open agent console
        </Link>
      </div>

      {/* Summary metrics */}
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
                  {item.value}
                  {item.unit && <span className={cn("ml-1 text-base font-normal", item.accent ? "text-white/60" : "text-black/40")}>{item.unit}</span>}
                </p>
                <p className={cn("mt-1 text-xs", item.accent ? "text-white/50" : "text-black/50")}>{item.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Protocols + activity */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Casper DeFi protocols */}
        <Card className={cn(card, "lg:col-span-3")}>
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
              <h3 className="text-sm font-medium text-black flex items-center gap-2">
                <TrendingUp className="size-4" />
                Casper DeFi venues
              </h3>
              <span className="text-xs text-black/40">Ranked by risk-adjusted APY</span>
            </div>
            <div className="divide-y divide-black/5">
              {PROTOCOLS.map((p, i) => (
                <div key={p.name} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-black/[0.02]">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-xs font-medium text-black/60">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-black truncate">{p.name}</p>
                    <div className="mt-2 h-1.5 w-full max-w-sm rounded-full bg-black/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#2B2644] to-[#4a4270]"
                        style={{ width: `${p.pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-medium text-emerald-600">{p.apy}</p>
                    <p className="text-xs text-black/40">
                      <span className={cn("inline-block size-1.5 rounded-full mr-1 align-middle", p.risk === "Low" ? "bg-emerald-500" : "bg-amber-500")} />
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
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", a.positive ? "bg-emerald-500" : "bg-black/20")} />
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

      {/* MCP + guardrails strip */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="rounded-2xl border-transparent bg-[#2B2644] shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <Server className="size-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-white">MCP layer connected</p>
              <p className="text-sm text-white/60">12/12 tools exposing Casper contract state to the LLM.</p>
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
              <p className="text-sm text-black/50">Auto-sign limit, per-venue caps and emergency stop enforced.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
