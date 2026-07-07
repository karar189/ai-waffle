"use client";

import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CryptoAnalysis } from "@/lib/finarc-api";

const CRYPTO_ASSETS = ["BTC", "ETH", "SOL", "BNB", "DOGE"] as const;
const RISK_LEVELS = ["conservative", "moderate", "aggressive"] as const;

const LEVERAGE_FIXED = 20;

export interface FetchMLSignalModalsProps {
  showFetchSignalModal: boolean;
  setShowFetchSignalModal: (v: boolean) => void;
  showSettingsModal: boolean;
  setShowSettingsModal: (v: boolean) => void;
  selectedAsset: string;
  setSelectedAsset: (v: string) => void;
  capital: number;
  setCapital: (v: number) => void;
  riskLevel: string;
  setRiskLevel: (v: string) => void;
  tpPct: number;
  setTpPct: (v: number) => void;
  slPct: number;
  setSlPct: (v: number) => void;
  tpSlMode: string;
  setTpSlMode: (v: string) => void;
  supervisorIntervalSeconds: number;
  setSupervisorIntervalSeconds: (v: number) => void;
  savedAt: Date | null;
  onSaveSettings: () => void;
  cryptoAnalysis: CryptoAnalysis | null;
  loadingFetch: boolean;
  fetchError: string | null;
  setFetchError: (v: string | null) => void;
  onFetchSignal: () => void;
}

export function FetchMLSignalModals({
  showFetchSignalModal,
  setShowFetchSignalModal,
  showSettingsModal,
  setShowSettingsModal,
  selectedAsset,
  setSelectedAsset,
  capital,
  setCapital,
  riskLevel,
  setRiskLevel,
  tpPct,
  setTpPct,
  slPct,
  setSlPct,
  tpSlMode,
  setTpSlMode,
  supervisorIntervalSeconds,
  setSupervisorIntervalSeconds,
  savedAt,
  onSaveSettings,
  cryptoAnalysis,
  loadingFetch,
  fetchError,
  setFetchError,
  onFetchSignal,
}: FetchMLSignalModalsProps) {
  const leverage = LEVERAGE_FIXED;
  const exposure = capital * leverage;
  const tpUsd = exposure * tpPct;
  const slUsd = exposure * slPct;
  const closeFetchModal = () => {
    setShowFetchSignalModal(false);
    setFetchError(null);
  };

  return (
    <>
      {/* Fetch ML Signal / AI Analysis Modal */}
      {showFetchSignalModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={closeFetchModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/10 bg-gray-900 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                {cryptoAnalysis ? "ML Signal" : "Fetch ML Signal"}
              </h2>
              <button
                type="button"
                onClick={closeFetchModal}
                className="text-white/60 transition-colors hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            {fetchError && (
              <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/20 p-3 text-sm text-red-400">
                {fetchError}
              </div>
            )}

            {cryptoAnalysis ? (
              <>
                <div className="mb-4 grid grid-cols-2 gap-4">
                  <div>
                    <div className="mb-1 text-xs text-white/40">Symbol</div>
                    <div className="font-semibold text-white">{cryptoAnalysis.symbol}</div>
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-white/40">Recommendation (futures)</div>
                    <div
                      className={`font-semibold ${
                        cryptoAnalysis.recommendation === "BUY"
                          ? "text-emerald-400"
                          : cryptoAnalysis.recommendation === "SELL"
                            ? "text-red-400"
                            : "text-amber-400"
                      }`}
                    >
                      {cryptoAnalysis.recommendation === "BUY" ? "LONG" : cryptoAnalysis.recommendation === "SELL" ? "SHORT" : cryptoAnalysis.recommendation}
                    </div>
                  </div>
                  {cryptoAnalysis.confidence_score != null && (
                    <div>
                      <div className="mb-1 text-xs text-white/40">Confidence</div>
                      <div className="font-semibold text-white">{cryptoAnalysis.confidence_score}/10</div>
                    </div>
                  )}
                </div>

                <div className="space-y-4 border-t border-white/10 pt-4">
                  <div>
                    <div className="mb-2 text-xs text-white/40">Summary</div>
                    <div className="text-sm text-white/80">{cryptoAnalysis.summary}</div>
                  </div>
                  <div>
                    <div className="mb-2 text-xs text-white/40">Recommendation reasoning</div>
                    <div className="text-sm text-white/80">{cryptoAnalysis.recommendation_reasoning}</div>
                  </div>
                  <div>
                    <div className="mb-2 text-xs text-white/40">Market overview</div>
                    <div className="text-sm text-white/80">{cryptoAnalysis.market_overview}</div>
                  </div>
                  <div>
                    <div className="mb-2 text-xs text-white/40">Technical analysis</div>
                    <div className="text-sm text-white/80">{cryptoAnalysis.technical_analysis}</div>
                  </div>
                  {cryptoAnalysis.news_sentiment_summary && (
                    <div>
                      <div className="mb-2 text-xs text-white/40">News sentiment</div>
                      <div className="text-sm text-white/80">{cryptoAnalysis.news_sentiment_summary}</div>
                    </div>
                  )}
                  {(cryptoAnalysis.suggested_entry != null || cryptoAnalysis.suggested_tp != null || cryptoAnalysis.suggested_sl != null) && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {cryptoAnalysis.suggested_entry != null && (
                        <div className="rounded-lg bg-white/5 p-2">
                          <div className="text-xs text-white/40">Entry</div>
                          <div className="font-semibold text-white">
                            ${cryptoAnalysis.suggested_entry.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      )}
                      {cryptoAnalysis.suggested_tp != null && (
                        <div className="rounded-lg bg-white/5 p-2">
                          <div className="text-xs text-white/40">Take profit</div>
                          <div className="font-semibold text-emerald-400">
                            ${cryptoAnalysis.suggested_tp.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      )}
                      {cryptoAnalysis.suggested_sl != null && (
                        <div className="rounded-lg bg-white/5 p-2">
                          <div className="text-xs text-white/40">Stop loss</div>
                          <div className="font-semibold text-red-400">
                            ${cryptoAnalysis.suggested_sl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {cryptoAnalysis.risk_assessment && (
                    <div>
                      <div className="mb-2 text-xs text-white/40">Risk assessment</div>
                      <div className="text-sm text-white/80">{cryptoAnalysis.risk_assessment}</div>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex gap-3">
                  <Button
                    onClick={onFetchSignal}
                    disabled={loadingFetch}
                    variant="subtle"
                    className="flex-1 gap-2"
                  >
                    {loadingFetch && <Loader2 className="size-4 animate-spin" />}
                    Refresh Signal
                  </Button>
                  <Button
                    onClick={closeFetchModal}
                    className="flex-1 border-green-500/50 bg-green-500/20 text-green-400 hover:bg-green-500/30"
                  >
                    Close
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-white/60">
                  Use your Simulation Settings (asset, capital, risk, TP/SL). Click Fetch Signal to get AI analysis from FinArc.
                </p>
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-white/40 mb-2">Current settings</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-white/60">Asset</span>
                    <span className="font-medium text-white">{selectedAsset}</span>
                    <span className="text-white/60">Capital</span>
                    <span className="font-medium text-white">${capital.toLocaleString()}</span>
                    <span className="text-white/60">Exposure</span>
                    <span className="font-medium text-white">${exposure.toLocaleString()}</span>
                    <span className="text-white/60">Risk</span>
                    <span className="font-medium text-white capitalize">{riskLevel}</span>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={onFetchSignal}
                    disabled={loadingFetch}
                    className="flex-1 gap-2 bg-blue-600 hover:bg-blue-500"
                  >
                    {loadingFetch && <Loader2 className="size-4 animate-spin" />}
                    Fetch Signal
                  </Button>
                  <Button
                    variant="outline"
                    onClick={closeFetchModal}
                    className="flex-1 border-white/20 text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Simulation Settings Modal */}
      {showSettingsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setShowSettingsModal(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-gray-900 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Simulation Controls</h2>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-white/60 transition-colors hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            {savedAt && (
              <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
                Saved settings · Last saved {savedAt.toLocaleTimeString()}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-white/60">Select Asset</label>
                <select
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-white/30 focus:outline-none"
                >
                  {CRYPTO_ASSETS.map((a) => (
                    <option key={a} value={a} className="bg-black text-white">
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm text-white/60">Capital Amount ($)</label>
                <input
                  type="number"
                  min={1}
                  value={capital}
                  onChange={(e) => setCapital(Number(e.target.value) || 1000)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-white/30 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-white/60">Leverage</label>
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white">
                  {leverage}x (Fixed)
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm text-white/60">Risk Level</label>
                <select
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-white/30 focus:outline-none"
                >
                  {RISK_LEVELS.map((r) => (
                    <option key={r} value={r} className="bg-black text-white capitalize">
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm text-white/60">TP/SL mode</label>
                <select
                  value={tpSlMode}
                  onChange={(e) => setTpSlMode(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-white/30 focus:outline-none"
                >
                  <option value="fixed" className="bg-black text-white">Fixed — use TP/SL % below</option>
                  <option value="dynamic" className="bg-black text-white">Dynamic — ATR-based</option>
                </select>
              </div>
              {tpSlMode === "fixed" && (
                <>
                  <div>
                    <label className="mb-2 block text-sm text-white/60">Take profit % (ratio)</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      max={1}
                      value={tpPct}
                      onChange={(e) => setTpPct(Number(e.target.value) || 0)}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-white/30 focus:outline-none"
                    />
                    <div className="mt-1 text-xs text-emerald-400">+${tpUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT</div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-white/60">Stop loss % (ratio)</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      max={1}
                      value={slPct}
                      onChange={(e) => setSlPct(Number(e.target.value) || 0)}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-white/30 focus:outline-none"
                    />
                    <div className="mt-1 text-xs text-red-400">-${slUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT</div>
                  </div>
                </>
              )}
              <div>
                <label className="mb-2 block text-sm text-white/60">Supervisor check interval (seconds)</label>
                <input
                  type="number"
                  min={30}
                  max={300}
                  step={10}
                  value={supervisorIntervalSeconds}
                  onChange={(e) => setSupervisorIntervalSeconds(Math.max(30, Math.min(300, Number(e.target.value) || 60)))}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-white/30 focus:outline-none"
                />
                <div className="mt-1 text-xs text-white/40">LLM checks position every N seconds (30–300). Only when in position.</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/60 mb-1">Exposure</div>
                <div className="text-lg font-semibold text-white">${exposure.toLocaleString()}</div>
                <div className="text-xs text-white/40 mt-1">{selectedAsset}USDT · Capital × {leverage}x</div>
              </div>
              <Button
                onClick={onSaveSettings}
                className="w-full border-green-500/50 bg-green-500/20 text-green-400 hover:bg-green-500/30"
              >
                Save Settings
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
