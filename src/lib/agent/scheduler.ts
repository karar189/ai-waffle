/**
 * Server-side autonomy scheduler.
 *
 * This is what makes the agent genuinely "self-driving": a background loop that
 * runs the monitor -> decide -> execute cycle on the server on a fixed interval,
 * with NO dashboard or client open. It is started once at server boot from
 * `src/instrumentation.ts`.
 *
 * Safety:
 *  - Only ticks when the agent is `running` and not paused / emergency-stopped.
 *  - Never overlaps ticks (a long LP saga won't be re-entered).
 *  - Whether a tick *executes* (vs. only decides) is controlled by the persisted
 *    `autoExecute` flag; all the usual policy guardrails still apply downstream.
 *  - A single module-level singleton guards against double-start (dev HMR, etc.).
 */

// NOTE: heavy deps (orchestrator/store, which import `fs`) are dynamically
// imported inside tick() so the static graph from instrumentation.ts stays
// edge-safe (instrumentation is compiled for both runtimes).

interface SchedulerState {
  started: boolean;
  ticking: boolean;
  timer: ReturnType<typeof setTimeout> | null;
  lastTickAt: number | null;
  lastError: string | null;
  lastSummary: string | null;
  tickCount: number;
}

// Survive dev hot-reload by stashing the singleton on globalThis.
const g = globalThis as unknown as { __agentScheduler?: SchedulerState };
const S: SchedulerState =
  g.__agentScheduler ??
  (g.__agentScheduler = {
    started: false,
    ticking: false,
    timer: null,
    lastTickAt: null,
    lastError: null,
    lastSummary: null,
    tickCount: 0,
  });

const DEFAULT_INTERVAL_SEC = Number(process.env.AGENT_TICK_INTERVAL_SEC ?? 60);

async function tick(): Promise<void> {
  if (S.ticking) return; // never overlap
  S.ticking = true;
  try {
    const { getState } = await import("./store");
    const { runAgentCycle } = await import("./orchestrator");
    const state = await getState();
    const active =
      state.running && !state.policy.paused && !state.policy.emergencyStop;

    if (active) {
      const res = await runAgentCycle({
        mode: "live",
        autoExecute: state.autoExecute,
      });
      S.tickCount += 1;
      S.lastError = res.executeError ?? null;
      S.lastSummary = res.execution
        ? `executed ${res.execution.fromProtocol} → ${res.execution.toProtocol} (${res.execution.status})`
        : res.proposal
        ? `proposed ${res.proposal.toProtocol}${res.llmVetoed ? " (LLM veto)" : state.autoExecute ? "" : " (decide-only)"}`
        : res.decision.noActionReason ?? "no action";
    } else {
      S.lastSummary = "idle (agent stopped/paused)";
    }
    S.lastTickAt = Date.now();
  } catch (e) {
    S.lastError = e instanceof Error ? e.message : "tick failed";
    S.lastTickAt = Date.now();
  } finally {
    S.ticking = false;
    scheduleNext();
  }
}

function scheduleNext(): void {
  if (!S.started) return;
  // Re-read the interval each cycle so policy changes take effect live.
  import("./store")
    .then(({ getState }) => getState())
    .then((state) => {
      const sec = state.autonomyIntervalSec || DEFAULT_INTERVAL_SEC;
      S.timer = setTimeout(tick, Math.max(15, sec) * 1000);
    })
    .catch(() => {
      S.timer = setTimeout(tick, DEFAULT_INTERVAL_SEC * 1000);
    });
}

/** Start the background loop (idempotent). Called from instrumentation. */
export function startScheduler(): void {
  if (S.started) return;
  S.started = true;
  // Kick off after a short delay so the server finishes booting first.
  S.timer = setTimeout(tick, 5000);
  console.log(
    `[agent/scheduler] background autonomy loop started (interval ~${DEFAULT_INTERVAL_SEC}s)`
  );
}

/** Snapshot of scheduler health for the status endpoint / dashboard. */
export function schedulerStatus() {
  return {
    started: S.started,
    ticking: S.ticking,
    lastTickAt: S.lastTickAt,
    lastError: S.lastError,
    lastSummary: S.lastSummary,
    tickCount: S.tickCount,
  };
}
