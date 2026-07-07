"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp, Search, Star } from "lucide-react";
import { MARKETS, type MarketItem } from "@/lib/market-from-symbol";

export type { MarketItem };
export { marketFromSymbolOrPair } from "@/lib/market-from-symbol";

type MarketTab = "spot" | "futures" | "lend";

interface MarketDropdownProps {
  selectedMarket: MarketItem;
  onSelect: (market: MarketItem) => void;
  className?: string;
}

export function MarketDropdown({ selectedMarket, onSelect, className }: MarketDropdownProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<MarketTab>("spot");
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPosition({ top: rect.bottom + 8, left: rect.left });
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const inTrigger = triggerRef.current?.contains(target);
      const inPanel = panelRef.current?.contains(target);
      if (!inTrigger && !inPanel) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const filtered = MARKETS.filter(
    (m) =>
      m.pair.toLowerCase().includes(search.toLowerCase()) ||
      m.symbol.toLowerCase().includes(search.toLowerCase())
  );

  const dropdownPanel = open && (
    <div
      ref={panelRef}
      className="fixed w-[420px] overflow-hidden rounded-xl border border-white/10 bg-neutral-950 shadow-2xl"
      style={{
        zIndex: 2147483647,
        top: position.top,
        left: position.left,
      }}
    >
          <div className="flex border-b border-white/10">
            {(["spot", "futures", "lend"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  tab === t ? "border-b-2 border-blue-500 bg-white/5 text-white" : "text-neutral-500 hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
            <button type="button" className="border-l border-white/10 p-3 text-neutral-500 hover:bg-white/5 hover:text-white">
              <Star className="size-4" />
            </button>
          </div>

          <div className="border-b border-white/10 p-2">
            <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
              <Search className="size-4 text-neutral-500" />
              <input
                type="text"
                placeholder="Search markets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-neutral-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 border-b border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
            <span>Market / Volume</span>
            <span className="text-right">Price / Change</span>
            <span className="text-right pr-6">Market Cap</span>
          </div>

          <div className="max-h-[320px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-neutral-500">No markets match</div>
            ) : (
              filtered.map((market) => (
                <button
                  key={market.id}
                  type="button"
                  onClick={() => {
                    onSelect(market);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/5 ${
                    selectedMarket.id === market.id ? "bg-blue-500/10" : ""
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">
                      {market.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{market.pair}</span>
                        <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
                          {market.leverage}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-500">{market.volume}</div>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col items-end">
                    <span className="font-semibold text-white">{market.price}</span>
                    <span
                      className={`text-[11px] font-medium ${
                        market.changePositive ? "text-emerald-500" : "text-red-500"
                      }`}
                    >
                      {market.change}
                    </span>
                  </div>
                  <div className="w-20 text-right text-[11px] text-neutral-500">{market.marketCap}</div>
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    className="rounded p-1 text-neutral-500 hover:bg-white/10 hover:text-amber-400"
                    aria-label="Favorite"
                  >
                    <Star className="size-4" />
                  </button>
                </button>
              ))
            )}
          </div>
        </div>
  );

  return (
    <>
      <div ref={triggerRef} className={`relative ${className ?? ""}`}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2.5 rounded-full border-2 border-white/20 border-blue-500/50 bg-blue-950/80 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:border-blue-500/70 hover:bg-blue-950"
        >
          <span className="size-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
          {selectedMarket.pair}
          {open ? (
            <ChevronUp className="size-4 text-neutral-300" />
          ) : (
            <ChevronDown className="size-4 text-neutral-300" />
          )}
        </button>
      </div>
      {typeof document !== "undefined" && dropdownPanel && createPortal(dropdownPanel, document.body)}
    </>
  );
}
