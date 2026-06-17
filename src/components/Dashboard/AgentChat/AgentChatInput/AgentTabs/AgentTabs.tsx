import { Network } from "lucide-react";

import { useConversationAgents } from "@/hooks/useConversationAgents";
import { useAgentDismissStore } from "@/store/dashboard/useAgentDismissStore";
import {
  agentTabId,
  PanelTabKind,
  usePanelStore,
  workflowTabId,
} from "@/store/dashboard/usePanelStore";

import { AgentVignette } from "./AgentVignette";

export type AgentTabsProps = {
  // The conversation this input belongs to. Sub-agent presence is scoped to it.
  claudeSessionId: string | null;
  // The conversation's own (main/orchestrator) agent name — excluded from tabs,
  // because the orchestrator IS the conversation (its activity is the chat).
  orchestratorName: string;
};

// Active-agents row above the composer: an "Active:" label, a session-overview
// control, and one vignette per sub-agent seen in this conversation. Each
// vignette shows a hue-tinted avatar (live dot when running), the name, and an
// inline `×`. Clicking a vignette opens that agent's live view in the right
// panel; the `×` cosmetically dismisses it. Renders nothing when the
// conversation has no sub-agents.
export function AgentTabs({ claudeSessionId, orchestratorName }: AgentTabsProps) {
  const agents = useConversationAgents(claudeSessionId, orchestratorName);
  const openPanel = usePanelStore((s) => s.open);
  const dismiss = useAgentDismissStore((s) => s.dismiss);
  if (agents.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-[7px] px-3 pb-2">
      <span className="mr-0.5 text-[11px] text-[var(--color-text-muted)]">
        Active:
      </span>
      <button
        type="button"
        aria-label="Open session overview"
        data-testid="session-overview-open"
        onClick={() =>
          openPanel({
            id: workflowTabId(claudeSessionId),
            kind: PanelTabKind.Workflow,
            title: "Session overview",
            payload: { claudeSessionId },
          })
        }
        className="flex h-6 w-6 items-center justify-center rounded-md cursor-pointer transition-colors hover:bg-surface-3"
        style={{
          background: "var(--color-surface-2)",
          color: "var(--color-text-secondary)",
          border: "1px solid var(--color-border)",
        }}
      >
        <Network size={12} />
      </button>
      {agents.map((agent) => (
        <AgentVignette
          key={agent.name}
          agent={agent}
          onOpen={() =>
            openPanel({
              id: agentTabId(agent.name, claudeSessionId),
              kind: PanelTabKind.Agent,
              title: agent.name,
              payload: { agentName: agent.name, claudeSessionId },
            })
          }
          onDismiss={() => dismiss(claudeSessionId, agent.name, agent.latestSeq)}
        />
      ))}
    </div>
  );
}
