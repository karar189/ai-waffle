"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  Bot,
  Play,
  Square,
  ShieldAlert,
  Zap,
  ArrowRight,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import {
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  agentApi,
  explorerDeployUrl,
  type AgentStatus,
  type SnapshotDto,
} from "@/lib/agent/client";
import type { RebalanceProposal, PolicyConfig } from "@/lib/rebalance/types";

const PIE_COLORS = ["#2B2644", "#34d399", "#60a5fa", "#f59e0b", "#a78bfa", "#22d3ee"];
const MONITOR_INTERVAL_MS = 15000;

const CARD = "border-black/10 bg-white rounded-2xl shadow-sm";

const fmtCspr = (n: number) =>
  `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} CSPR`;
const fmtPct = (n: number) => `${(n * 100).toFixed(2)}%`;

export default function AgentDashboardPage() {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [snapshot, setSnapshot] = useState<SnapshotDto | null>(null);
  const [proposal, setProposal] = useState<RebalanceProposal | null>(null);
  const [mode, setMode] = useState<"dry_run" | "live">("dry_run");
  const [autoExecute, setAutoExecute] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [s, snap] = await Promise.all([agentApi.status(), agentApi.snapshot()]);
      setStatus(s);
      setSnapshot(snap);
      const latest = s.decisions.find((d) => d.proposal);
      setProposal(latest?.proposal ?? null);
      setError(null);
      // Best-effort: confirm any still-submitted executions.
      const pending = s.executions.filter((e) => e.status === "submitted" && e.deployHash);
      if (pending.length) {
        await Promise.allSettled(pending.map((e) => agentApi.confirm(e.id)));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "refresh failed");
    }
  }, []);

  const runMonitor = useCallback(async () => {
    try {
      const res = await agentApi.monitor(mode, autoExecute);
      setProposal(res.proposal);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "monitor failed");
    }
  }, [mode, autoExecute, refresh]);

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, 10000);
    return () => clearInterval(poll);
  }, [refresh]);

  // Autonomous monitoring loop.
  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    if (status?.running) {
      runMonitor();
      timer.current = setInterval(runMonitor, MONITOR_INTERVAL_MS);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [status?.running, runMonitor]);

  const setControl = async (body: Parameters<typeof agentApi.updatePolicy>[0]) => {
    setBusy(true);
    try {
      await agentApi.updatePolicy(body);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "update failed");
    } finally {
      setBusy(false);
    }
  };

  const patchPolicy = (patch: Partial<PolicyConfig>) => setControl({ policy: patch });

  const execute = async () => {
    if (!proposal) return;
    setBusy(true);
    try {
      const res = await agentApi.execute(proposal);

      // Auto path: server already signed + submitted.
      if (!res.unsignedTransaction) {
        await refresh();
        return;
      }

      // Human path: sign the unsigned transaction with Casper Wallet.
      const account = status?.connectedAccount;
      if (!account) {
        setError("Connect Casper Wallet to approve this move.");
        return;
      }
      const w = window as unknown as {
        CasperWalletProvider?: () => {
          sign: (
            txJson: string,
            publicKeyHex: string
          ) => Promise<{ cancelled: boolean; signatureHex?: string }>;
        };
      };
      if (!w.CasperWalletProvider) {
        setError(
          "Move needs approval but Casper Wallet is not detected. Install it or lower the auto-sign limit."
        );
        return;
      }
      const provider = w.CasperWalletProvider();
      const signed = await provider.sign(
        JSON.stringify(res.unsignedTransaction),
        account
      );
      if (signed.cancelled || !signed.signatureHex) {
        setError("Signing cancelled.");
        return;
      }
      await agentApi.approve({
        executionId: res.execution.id,
        action: "approve",
        unsignedTransaction: res.unsignedTransaction,
        signatureHex: signed.signatureHex,
        publicKey: account,
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "execute failed");
    } finally {
      setBusy(false);
    }
  };

  const positions = status?.positions ?? [];
  const totalCspr = positions.reduce((s, p) => s + p.amountCspr, 0);
  const bestYield = snapshot?.ranked?.[0];
  const network = snapshot?.meta.network ?? "testnet";
  const pieData = positions.map((p) => ({ name: p.protocol, value: p.amountCspr }));

  return (
    <div className="flex flex-col gap-6 px-4 md:px-6 py-6 md:py-8 max-w-[88rem] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl md:text-4xl font-medium tracking-tight text-black" style={{ letterSpacing: "-0.03em" }}>
            <Bot className="size-8 text-[#2B2644]" />
            Yield-Routing Agent
          </h1>
          <p className="mt-1 text-sm text-black/60">
            Autonomous Casper yield monitoring, decisions, and rebalancing over MCP.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-50 text-emerald-700">
            {network} · era {snapshot?.meta.currentEraId ?? "—"}
          </Badge>
          {status?.connectedAccount ? (
            <Badge variant="secondary" className="border-black/10 bg-black/5 text-black font-mono">
              {status.connectedAccount.slice(0, 6)}…{status.connectedAccount.slice(-4)}
            </Badge>
          ) : (
            <Badge variant="outline" className="border-black/10 text-black/50">
              Wallet not connected
            </Badge>
          )}
          <Button size="sm" variant="ghost" className="text-black/60 hover:bg-black/5 hover:text-black" onClick={refresh}>
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          {error}
        </div>
      )}

      {/* Controls */}
      <Card className={CARD}>
        <CardContent className="flex flex-wrap items-center gap-4 py-4">
          <Button
            className={status?.running ? "rounded-full bg-red-600 text-white hover:bg-red-700" : "rounded-full bg-black text-white hover:bg-gray-800"}
            onClick={() => setControl({ running: !status?.running })}
            disabled={busy || status?.policy.emergencyStop}
          >
            {status?.running ? (
              <>
                <Square className="mr-2 size-4" /> Stop monitoring
              </>
            ) : (
              <>
                <Play className="mr-2 size-4" /> Start monitoring
              </>
            )}
          </Button>

          <div className="flex items-center gap-2">
            <Label className="text-xs text-black/60">Mode</Label>
            <Switch
              checked={mode === "live"}
              onCheckedChange={(v) => setMode(v ? "live" : "dry_run")}
            />
            <span className="text-sm text-black/70">
              {mode === "live" ? "Live" : "Dry-run"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-xs text-black/60">Auto-execute</Label>
            <Switch checked={autoExecute} onCheckedChange={setAutoExecute} />
          </div>

          <Button variant="outline" className="rounded-full bg-white text-black border-black/15 hover:bg-black/5 hover:text-black" onClick={runMonitor} disabled={busy}>
            <Activity className="mr-2 size-4" /> Run cycle now
          </Button>

          <Button
            variant="outline"
            className={
              status?.policy.emergencyStop
                ? "rounded-full bg-black text-white hover:bg-gray-800 hover:text-white border-transparent"
                : "rounded-full bg-white border-red-500/40 text-red-600 hover:bg-red-50 hover:text-red-600"
            }
            onClick={() => setControl({ emergencyStop: !status?.policy.emergencyStop })}
            disabled={busy}
          >
            <ShieldAlert className="mr-2 size-4" />
            {status?.policy.emergencyStop ? "Resume (clear stop)" : "Emergency stop"}
          </Button>

          <Badge variant="outline" className="border-black/10 text-black/60">
            Auto-sign {status?.autoSignEnabled ? "enabled" : "disabled"}
          </Badge>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Portfolio value" value={fmtCspr(totalCspr)} sub={`${positions.length} positions`} />
        <StatCard
          label="Best available yield"
          value={bestYield ? fmtPct(bestYield.apy) : "—"}
          sub={bestYield?.protocol ?? "—"}
          accent
        />
        <StatCard
          label="Suggested move"
          value={proposal ? fmtCspr(proposal.amountCspr) : "None"}
          sub={proposal ? `+${fmtPct(proposal.apyDelta)} APY` : "No action"}
        />
      </div>

      {/* Allocation + best yields */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className={CARD}>
          <CardHeader>
            <CardTitle className="text-lg font-medium text-black">Current allocation</CardTitle>
            <CardDescription className="text-black/50">Live positions by venue</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length ? (
              <div className="mx-auto h-[240px] w-full max-w-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-black/50">No positions yet.</p>
            )}
            <div className="mt-4 space-y-1">
              {positions.map((p, i) => (
                <div key={p.venueId} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-black/70">
                    <span className="size-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {p.protocol}
                  </span>
                  <span className="text-black/60">{fmtCspr(p.amountCspr)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className={CARD}>
          <CardHeader>
            <CardTitle className="text-lg font-medium text-black">Best available yield</CardTitle>
            <CardDescription className="text-black/50">Risk-adjusted ranking across Casper venues</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(snapshot?.ranked ?? []).slice(0, 6).map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-xl border border-black/5 bg-black/[0.02] px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-black/80">
                    #{v.rank} {v.protocol}
                  </p>
                  <p className="text-xs text-black/50">
                    risk {v.riskScore} · risk-adj {fmtPct(v.riskAdjustedApy)}
                    {v.riskFlags.length ? ` · ${v.riskFlags.join(", ")}` : ""}
                  </p>
                </div>
                <span className="ml-3 shrink-0 font-semibold text-emerald-600">{fmtPct(v.apy)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Suggested move */}
      <Card className="rounded-2xl border border-emerald-500/20 bg-emerald-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-medium text-black">
            <Zap className="size-5 text-emerald-600" /> Suggested move
          </CardTitle>
          <CardDescription className="text-black/50">The agent&apos;s current decision and reasoning</CardDescription>
        </CardHeader>
        <CardContent>
          {proposal ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-md bg-black/5 px-2 py-1 text-black/70">{proposal.fromProtocol}</span>
                <ArrowRight className="size-4 text-black/40" />
                <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-emerald-700">{proposal.toProtocol}</span>
                <span className="text-black/60">{fmtCspr(proposal.amountCspr)}</span>
                <Badge variant="outline" className="border-black/10 text-black/60">
                  {proposal.signingPath === "auto" ? "auto-sign" : "needs approval"}
                </Badge>
              </div>
              <p className="text-sm leading-relaxed text-black/70">{proposal.reasoning}</p>
              <Button className="rounded-full bg-black text-white hover:bg-gray-800" onClick={execute} disabled={busy}>
                Execute rebalance
              </Button>
            </div>
          ) : (
            <p className="text-sm text-black/50">
              {status?.decisions[0]?.noActionReason ?? "No rebalance suggested right now."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Policy controls */}
      <Card className={CARD}>
        <CardHeader>
          <CardTitle className="text-lg font-medium text-black">Policy & guardrails</CardTitle>
          <CardDescription className="text-black/50">Constrain what the agent is allowed to do</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          {status && (
            <>
              <PolicySlider
                label="Min yield delta"
                value={status.policy.minYieldDelta}
                display={fmtPct(status.policy.minYieldDelta)}
                min={0}
                max={0.1}
                step={0.005}
                onCommit={(v) => patchPolicy({ minYieldDelta: v })}
              />
              <PolicySlider
                label="Max allocation per venue"
                value={status.policy.maxAllocationPct}
                display={fmtPct(status.policy.maxAllocationPct)}
                min={0.1}
                max={1}
                step={0.05}
                onCommit={(v) => patchPolicy({ maxAllocationPct: v })}
              />
              <PolicySlider
                label="Auto-sign limit (CSPR)"
                value={status.policy.autoSignLimitCspr}
                display={`${status.policy.autoSignLimitCspr} CSPR`}
                min={0}
                max={5000}
                step={50}
                onCommit={(v) => patchPolicy({ autoSignLimitCspr: v })}
              />
              <PolicySlider
                label="Risk aversion"
                value={status.policy.riskAversion}
                display={status.policy.riskAversion.toFixed(2)}
                min={0}
                max={1}
                step={0.05}
                onCommit={(v) => patchPolicy({ riskAversion: v })}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Timeline + executions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className={CARD}>
          <CardHeader>
            <CardTitle className="text-lg font-medium text-black">Agent timeline</CardTitle>
            <CardDescription className="text-black/50">Reasoning & decision log</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(status?.decisions ?? []).slice(0, 8).map((d) => (
              <div key={d.id} className="border-l-2 border-black/10 pl-3">
                <div className="flex items-center gap-2 text-xs text-black/50">
                  <span>{new Date(d.createdAt).toLocaleTimeString()}</span>
                  <Badge variant="outline" className="h-4 border-black/10 px-1 text-[10px] text-black/60">
                    {d.mode}
                  </Badge>
                  <span>era {d.eraId}</span>
                </div>
                <p className="text-sm text-black/70">
                  {d.proposal
                    ? `Proposed: ${d.proposal.fromProtocol} → ${d.proposal.toProtocol} (${fmtCspr(
                        d.proposal.amountCspr
                      )})`
                    : d.noActionReason ?? "No action"}
                </p>
              </div>
            ))}
            {!status?.decisions.length && (
              <p className="text-sm text-black/50">No decisions logged yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className={CARD}>
          <CardHeader>
            <CardTitle className="text-lg font-medium text-black">Executions</CardTitle>
            <CardDescription className="text-black/50">Rebalances with on-chain proof</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(status?.executions ?? []).slice(0, 8).map((e) => (
              <div key={e.id} className="rounded-xl border border-black/5 bg-black/[0.02] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-black/70">
                    {e.fromProtocol} → {e.toProtocol}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      e.status === "submitted" || e.status === "confirmed"
                        ? "border-emerald-500/30 text-emerald-700"
                        : e.status === "failed" || e.status === "rejected"
                        ? "border-red-500/30 text-red-600"
                        : "border-black/10 text-black/60"
                    }
                  >
                    {e.status}
                  </Badge>
                </div>
                <p className="text-xs text-black/50">
                  {fmtCspr(e.amountCspr)} · {e.signingPath}
                </p>
                {e.deployHash && (
                  <a
                    href={explorerDeployUrl(network, e.deployHash)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                  >
                    {e.deployHash.slice(0, 12)}… <ExternalLink className="size-3" />
                  </a>
                )}
                {e.error && <p className="mt-1 text-xs text-red-600">{e.error}</p>}
              </div>
            ))}
            {!status?.executions.length && (
              <p className="text-sm text-black/50">No executions yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <Card className="border-black/10 bg-white rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-black/50">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-medium ${accent ? "text-emerald-600" : "text-black"}`}>{value}</p>
        <p className="truncate text-xs text-black/50">{sub}</p>
      </CardContent>
    </Card>
  );
}

function PolicySlider({
  label,
  value,
  display,
  min,
  max,
  step,
  onCommit,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onCommit: (v: number) => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-black/60">{label}</Label>
        <span className="text-sm text-black/80">{display}</span>
      </div>
      <Slider
        value={[local]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => setLocal(v[0])}
        onValueCommit={(v) => onCommit(v[0])}
      />
    </div>
  );
}
