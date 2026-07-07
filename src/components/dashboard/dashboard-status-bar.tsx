"use client";

import { Circle } from "lucide-react";

export function DashboardStatusBar() {
  return (
    <footer className="flex h-8 shrink-0 items-center justify-between border-t border-black/10 bg-white px-4 md:px-6 text-xs text-gray-500">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-emerald-600">
          <Circle className="size-2 fill-current" />
          AGENT ONLINE
        </span>
        <span>Casper testnet</span>
        <span>MCP: 12/12 Tools</span>
      </div>
      <div className="flex items-center gap-4">
        <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
    </footer>
  );
}
