/**
 * Preset data saved when user clicks "Test Strategy" on AI Trade Plan Builder.
 * Loaded on the simulate page to prefill Simulation Settings modal.
 */

export const SIMULATE_PRESET_KEY = "finarc-simulate-preset";

export type SimulatePreset = {
  asset?: string;
  capital?: number;
  riskLevel?: string;
  tpPct?: number;
  slPct?: number;
  tpSlMode?: string;
  supervisorIntervalSeconds?: number;
};

export function saveSimulatePreset(preset: SimulatePreset): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SIMULATE_PRESET_KEY, JSON.stringify(preset));
  } catch (_) {}
}

export function loadAndClearSimulatePreset(): SimulatePreset | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SIMULATE_PRESET_KEY);
    if (!raw) return null;
    window.localStorage.removeItem(SIMULATE_PRESET_KEY);
    const parsed = JSON.parse(raw) as SimulatePreset;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
