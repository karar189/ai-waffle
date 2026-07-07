"use client";

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useState,
  type ReactNode,
} from "react";

export type ViewId =
  | "home"
  | "ai-trade-plan"
  | "portfolio"
  | "market"
  | "strategies"
  | "simulate";

export type SimulatePayload = { symbol?: string; pair?: string };

export type Tab = { id: string; label: string; view?: ViewId; payload?: SimulatePayload };

type DashboardTabContextValue = {
  tabs: Tab[];
  activeId: string | null;
  addTab: () => void;
  closeTab: (id: string) => void;
  setActiveId: (id: string) => void;
  openView: (viewId: ViewId, label: string, payload?: SimulatePayload) => void;
};

const DashboardTabContext = createContext<DashboardTabContextValue | null>(null);

const HOME_TAB: Tab = { id: "home", label: "Home", view: "home" };

type TabState = { tabs: Tab[]; activeId: string };

export function DashboardTabProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TabState>({
    tabs: [HOME_TAB],
    activeId: HOME_TAB.id,
  });
  const tabCounter = useId();
  const { tabs, activeId } = state;

  const openView = useCallback(
    (viewId: ViewId, label: string, payload?: SimulatePayload) => {
      if (viewId === "home") {
        setState((prev) => ({ ...prev, activeId: HOME_TAB.id }));
        return;
      }
      setState((prev) => {
        const existing = prev.tabs.find((t) => t.view === viewId);
        if (existing) {
          const updated = payload
            ? prev.tabs.map((t) => (t.id === existing.id ? { ...t, payload } : t))
            : prev.tabs;
          return { ...prev, tabs: updated, activeId: existing.id };
        }
        const id = `tab-${viewId}-${tabCounter}-${prev.tabs.length}`;
        const newTab: Tab = { id, label, view: viewId, payload };
        return {
          tabs: [...prev.tabs, newTab],
          activeId: id,
        };
      });
    },
    [tabCounter]
  );

  const addTab = useCallback(() => {
    const next = state.tabs.length + 1;
    const id = `tab-${next}-${tabCounter}`;
    const label = `Tab ${next}`;
    setState((prev) => ({
      ...prev,
      tabs: [...prev.tabs, { id, label, view: "home" as ViewId }],
      activeId: id,
    }));
  }, [state.tabs.length, tabCounter]);

  const closeTab = useCallback((id: string) => {
    if (id === HOME_TAB.id) return;
    setState((prev) => {
      const nextTabs = prev.tabs.filter((t) => t.id !== id);
      const closedIndex = prev.tabs.findIndex((t) => t.id === id);
      const newActiveId =
        prev.activeId === id
          ? (nextTabs[Math.min(closedIndex, nextTabs.length - 1)] ?? nextTabs[0])?.id ?? HOME_TAB.id
          : prev.activeId;
      return {
        tabs: nextTabs,
        activeId: newActiveId,
      };
    });
  }, []);

  const setActiveId = useCallback((id: string) => {
    setState((prev) => ({ ...prev, activeId: id }));
  }, []);

  const value: DashboardTabContextValue = {
    tabs,
    activeId,
    addTab,
    closeTab,
    setActiveId,
    openView,
  };

  return (
    <DashboardTabContext.Provider value={value}>
      {children}
    </DashboardTabContext.Provider>
  );
}

export function useDashboardTabs() {
  const ctx = useContext(DashboardTabContext);
  if (!ctx) throw new Error("useDashboardTabs must be used within DashboardTabProvider");
  return ctx;
}

export function useDashboardTabsOptional() {
  return useContext(DashboardTabContext);
}
