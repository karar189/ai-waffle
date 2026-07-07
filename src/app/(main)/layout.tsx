import { DashboardTopBar } from "@/components/dashboard/dashboard-top-bar";
import { DashboardStatusBar } from "@/components/dashboard/dashboard-status-bar";
import { AgentSidebar } from "@/components/dashboard/agent-sidebar";
import "@xyflow/react/dist/style.css";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh flex-col bg-[#F5F5F5] text-black min-w-0">
      <DashboardTopBar />
      <main className="flex-1 overflow-auto min-w-0">
        {children}
      </main>
      <DashboardStatusBar />
      <AgentSidebar />
    </div>
  );
}
