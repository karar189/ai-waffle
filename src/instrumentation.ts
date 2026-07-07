/**
 * Next.js instrumentation hook — runs once when the server process boots.
 * We use it to start the agent's background autonomy scheduler so the
 * monitor → decide → execute loop runs unattended (no dashboard required).
 *
 * The `process.env.NEXT_RUNTIME === "nodejs"` block is required: it lets the
 * edge compile of this file dead-code-eliminate the import (the scheduler pulls
 * in `fs` via the store, which the edge runtime can't resolve).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (process.env.AGENT_SCHEDULER === "off") return;
    const { startScheduler } = await import("./lib/agent/scheduler");
    startScheduler();
  }
}
