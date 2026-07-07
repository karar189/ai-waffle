"use client";

import { X } from "lucide-react";
import { useDashboardTabs } from "./dashboard-tab-context";

export function DashboardTabBar() {
  const { tabs, activeId, addTab, closeTab, setActiveId } = useDashboardTabs();

  return (
    <div className="flex items-center gap-1 border-b border-white/10 bg-black px-4 md:px-6 py-1.5">
      {tabs.map((tab) => {
        const isActive = activeId === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => setActiveId(tab.id)}
            className={`group flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-all ${
              isActive
                ? "bg-neutral-800 text-white shadow-sm ring-1 ring-white/10"
                : "text-white/90 hover:bg-white/5 hover:text-white"
            }`}
          >
            <span
              className={`size-3.5 shrink-0 rounded-sm ${
                isActive ? "bg-white" : "bg-white/40"
              }`}
            />
            <span className="min-w-0 truncate">{tab.label}</span>
            {tab.id !== "home" && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    closeTab(tab.id);
                  }
                }}
                className={`ml-0.5 rounded p-0.5 opacity-70 hover:bg-white/10 hover:opacity-100 ${
                  isActive ? "text-white" : "text-white/70"
                }`}
                aria-label={`Close ${tab.label}`}
              >
                <X className="size-3.5" />
              </span>
            )}
          </button>
        );
      })}
      <button
        type="button"
        onClick={addTab}
        className="rounded-md p-1.5 text-white/70 transition-colors hover:bg-white/5 hover:text-white"
        aria-label="New tab"
      >
        <span className="text-lg leading-none">+</span>
      </button>
    </div>
  );
}
