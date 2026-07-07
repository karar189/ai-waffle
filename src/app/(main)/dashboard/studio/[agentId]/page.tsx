"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AgentComposer } from "@/components/studio/agent-composer";
import type { StudioAgentDefinition } from "@/lib/studio/types";

export default function EditAgentPage() {
  const params = useParams();
  const agentId = typeof params?.agentId === "string" ? params.agentId : "";
  const [agent, setAgent] = useState<StudioAgentDefinition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) {
      setLoading(false);
      return;
    }
    fetch(`/api/studio/agents/${agentId}`)
      .then((r) => r.json())
      .then((data) => setAgent(data.agent ?? null))
      .finally(() => setLoading(false));
  }, [agentId]);

  if (loading) {
    return (
      <div className="flex h-[calc(100dvh-7.5rem)] items-center justify-center bg-[#F5F5F5] text-sm text-black/50">
        Loading agent…
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex h-[calc(100dvh-7.5rem)] flex-col items-center justify-center gap-3 bg-[#F5F5F5] text-black">
        <p>Agent not found.</p>
      </div>
    );
  }

  return <AgentComposer agentId={agentId} initialAgent={agent} />;
}
