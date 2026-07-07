"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Zap, Loader2, User, Bot, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CLAUDE_MODELS } from "@/lib/chat-models";
import { ChatMessageContent } from "@/components/dashboard/chat-message-content";

type Message = { role: "user" | "assistant"; content: string };

export function AgentSidebar() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState<string>(CLAUDE_MODELS[0].id);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })),
          model,
        }),
      });

      let data: { message?: string; error?: string; details?: string } = {};
      try {
        data = await res.json();
      } catch {
        setError(`Server returned invalid JSON (${res.status})`);
        setMessages((prev) => prev.slice(0, -1));
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const msg = data.error || `Request failed (${res.status})`;
        const details = data.details ? ` — ${data.details.slice(0, 80)}` : "";
        setError(msg + details);
        setMessages((prev) => prev.slice(0, -1));
        setLoading(false);
        return;
      }

      const reply = typeof data.message === "string" ? data.message : "";
      setMessages((prev) => [...prev, { role: "assistant", content: reply || "No response." }]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network or request failed");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Collapsed launcher */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-full bg-black py-3 pl-4 pr-5 text-white shadow-lg shadow-black/20 transition-all hover:bg-gray-800 hover:shadow-xl"
          aria-label="Open Yield Copilot"
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-white/15">
            <Zap className="size-3.5" />
          </span>
          <span className="text-sm font-medium">Yield Copilot</span>
          {messages.length > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-semibold">
              {messages.length}
            </span>
          )}
        </button>
      )}

      {/* Floating chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex w-[calc(100vw-3rem)] max-w-[26rem] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl shadow-black/20" style={{ height: "min(640px, calc(100vh - 7rem))" }}>
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-black/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-black text-white">
                <Zap className="size-4" />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-medium text-black">Yield Copilot</p>
                <p className="flex items-center gap-1 text-[11px] text-emerald-600">
                  <span className="size-1.5 rounded-full bg-emerald-500" /> Live over MCP
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-black/5 hover:text-black"
              title="Minimize"
              aria-label="Minimize Copilot"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Messages */}
          {messages.length === 0 ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 py-8">
              <div className="flex size-14 items-center justify-center rounded-full bg-black/5">
                <Zap className="size-7 text-black/40" />
              </div>
              <p className="text-sm font-medium text-black">Ask the Yield Copilot</p>
              <p className="text-center text-xs leading-relaxed text-black/50">
                Ask about Casper DeFi yields, current allocations, or the agent&apos;s reasoning. It reads
                live contract state over MCP to explain decisions and route funds.
              </p>
              <div className="mt-1 flex flex-wrap justify-center gap-2">
                {["Best yield right now?", "Why did it rebalance?", "Show my allocation"].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setInput(q)}
                    className="rounded-full border border-black/10 px-3 py-1.5 text-xs text-black/70 transition-colors hover:border-black/20 hover:bg-black/5"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "assistant" && (
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                      <Bot className="size-3.5 text-emerald-600" />
                    </div>
                  )}
                  <div
                    className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${
                      m.role === "user" ? "bg-black text-white" : "bg-black/[0.04] text-black"
                    }`}
                  >
                    {m.role === "user" ? m.content : <ChatMessageContent content={m.content} />}
                  </div>
                  {m.role === "user" && (
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-black/5">
                      <User className="size-3.5 text-black/50" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-2.5">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                    <Bot className="size-3.5 text-emerald-600" />
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl bg-black/[0.04] px-3 py-2 text-sm text-black/50">
                    <Loader2 className="size-4 animate-spin" />
                    Thinking…
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Composer */}
          <div className="shrink-0 space-y-2.5 border-t border-black/10 px-4 py-3">
            {error && <p className="text-xs text-red-600">{error}</p>}
            <form onSubmit={handleSubmit} className="relative">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about yields or routing…"
                className="h-10 rounded-full border-black/10 bg-black/[0.03] pr-10 text-black placeholder:text-gray-400 focus-visible:ring-black/20"
                disabled={loading}
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-black hover:bg-black/5"
                disabled={loading || !input.trim()}
              >
                <Send className="size-4" />
              </Button>
            </form>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="h-8 w-full rounded-md border border-black/10 bg-black/[0.03] px-2 text-xs text-black"
            >
              {CLAUDE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </>
  );
}
