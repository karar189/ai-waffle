/**
 * FinArc API client for forex, crypto, and news.
 * Backend: http://127.0.0.1:8000 (or NEXT_PUBLIC_FINARC_API_URL)
 */

const FINARC_API_BASE =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_FINARC_API_URL ?? "http://127.0.0.1:8000")
    : process.env.NEXT_PUBLIC_FINARC_API_URL ?? "http://127.0.0.1:8000";

export const FINARC_BASE_URL = FINARC_API_BASE;

// --- Forex types (based on FinArc API) ---
export interface ForexRate {
  pair?: string;
  rate?: number;
  bid?: number;
  ask?: number;
  timestamp?: string;
}

export interface ForexPairSummary {
  pair?: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  change?: number;
  change_pct?: number;
  volume?: number;
}

export interface ForexExploreItem {
  pair: string;
  rate?: number;
  bid?: number;
  close?: number;
  change?: number;
  change_pct?: number;
  change_percent?: number;
  volume?: number;
}

export interface ForexExploreResponse {
  gainers?: ForexExploreItem[];
  losers?: ForexExploreItem[];
  by_volume?: ForexExploreItem[];
  pairs?: ForexExploreItem[];
}

// --- Helpers ---
async function finarcFetch<T>(
  path: string,
  params?: Record<string, string | number>
): Promise<T> {
  const url = new URL(path, FINARC_API_BASE);
  if (params) {
    Object.entries(params).forEach(([k, v]) =>
      url.searchParams.set(k, String(v))
    );
  }
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FinArc API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// --- Forex endpoints ---
export async function getForexRate(pair: string): Promise<ForexRate> {
  return finarcFetch<ForexRate>("/rate", { pair });
}

export async function getPairSummary(pair: string): Promise<ForexPairSummary> {
  return finarcFetch<ForexPairSummary>("/pair-summary", { pair });
}

export async function getForexExplore(
  limit = 10
): Promise<ForexExploreResponse> {
  return finarcFetch<ForexExploreResponse>("/explore/forex", { limit });
}

// --- Health (for checking if API is up) ---
export interface HealthResponse {
  status?: string;
  alpha_vantage?: boolean;
  [key: string]: unknown;
}

export async function getHealth(): Promise<HealthResponse> {
  return finarcFetch<HealthResponse>("/health");
}

// --- Crypto AI Analysis (POST /ai-analysis/crypto) ---
export interface CryptoAnalysisRequest {
  symbol: string;
  investment_amount_usd: number;
  risk_profile: string;
  leverage?: number;
  tp_pct?: number | null;
  sl_pct?: number | null;
  tp_sl_mode?: string;
  supervisor_interval_seconds?: number | null;
}

export interface CryptoAnalysis {
  symbol: string;
  name?: string;
  summary: string;
  market_overview: string;
  technical_analysis: string;
  fundamental_factors: string;
  news_sentiment_summary?: string;
  recommendation: string;
  recommendation_reasoning: string;
  suggested_action: string;
  suggested_amount_usd?: number | null;
  suggested_entry?: number | null;
  suggested_tp?: number | null;
  suggested_sl?: number | null;
  risk_reward_ratio?: string | null;
  risk_assessment?: string;
  support_1?: number | null;
  support_2?: number | null;
  resistance_1?: number | null;
  resistance_2?: number | null;
  confidence_score?: number | null;
  timeframe?: string | null;
  investment_amount_usd?: number | null;
  risk_profile?: string | null;
}

async function finarcPost<T>(path: string, body: object): Promise<T> {
  const url = new URL(path, FINARC_API_BASE);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FinArc API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchCryptoAnalysis(
  request: CryptoAnalysisRequest
): Promise<CryptoAnalysis> {
  return finarcPost<CryptoAnalysis>("/ai-analysis/crypto", request);
}

// --- Simulation (paper trading, quant signals, logs, pause/stop) ---
export interface SimulationStartRequest {
  symbol: string;
  amount_usd: number;
  leverage?: number;
  poll_seconds?: number;
  tp_pct?: number | null;
  sl_pct?: number | null;
  risk_profile?: string;
  primary_timeframe?: string;
  strategy?: string;
}

export interface SimulationStatus {
  running: boolean;
  paused: boolean;
  symbol: string | null;
  last_price: number | null;
  side: "LONG" | "SHORT" | "FLAT";
  entry_price: number | null;
  position_size_usd: number | null;
  leverage: number | null;
  unrealized_pnl_usd: number | null;
  last_action: string | null;
  last_reason: string | null;
  active_strategy: string | null;
  tp_price: number | null;
  sl_price: number | null;
}

export interface SimulationStats {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate_pct: number;
  total_pnl_usd: number;
  avg_profit_usd: number;
  avg_loss_usd: number;
}

export interface SimulationLogEntry {
  ts: string;
  level: string;
  message: string;
}

export interface SimulationLogsResponse {
  logs: SimulationLogEntry[];
  running: boolean;
}

export async function simulationStart(
  req: SimulationStartRequest
): Promise<{ started: boolean; symbol: string; strategy: string | null }> {
  return finarcPost("/simulation/start", {
    symbol: req.symbol,
    amount_usd: req.amount_usd,
    leverage: req.leverage ?? 1,
    poll_seconds: req.poll_seconds ?? 1,
    tp_pct: req.tp_pct ?? null,
    sl_pct: req.sl_pct ?? null,
    risk_profile: req.risk_profile ?? "moderate",
    primary_timeframe: req.primary_timeframe ?? "15m",
    strategy: req.strategy ?? "momentum",
  });
}

export async function simulationStop(
  closePosition = true
): Promise<{ stopped: boolean; closed: boolean }> {
  const url = `${FINARC_API_BASE}/simulation/stop?closePosition=${closePosition}`;
  const res = await fetch(url, { method: "POST", headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`FinArc API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function simulationPause(): Promise<{ paused: boolean }> {
  return finarcPost("/simulation/pause", {});
}

export async function simulationResume(): Promise<{ resumed: boolean }> {
  return finarcPost("/simulation/resume", {});
}

export async function getSimulationStatus(): Promise<SimulationStatus> {
  return finarcFetch<SimulationStatus>("/simulation/status");
}

export async function getSimulationStats(): Promise<SimulationStats> {
  return finarcFetch<SimulationStats>("/simulation/stats");
}

export async function getSimulationLogs(): Promise<SimulationLogsResponse> {
  return finarcFetch<SimulationLogsResponse>("/simulation/logs");
}
