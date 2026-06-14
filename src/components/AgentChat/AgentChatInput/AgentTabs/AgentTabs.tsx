import { Network, X } from "lucide-react";

import { StatusDot } from "@/components/_ui/StatusDot";
import { colorMap } from "@/components/Workspace/utils";
import {
  CONVERSATION_AGENT_DOT,
  useConversationAgents,
} from "@/hooks/useConversationAgents";
import { useAgentDismissStore } from "@/store/useAgentDismissStore";
import {
  agentTabId,
  PanelTabKind,
  usePanelStore,
  workflowTabId,
} from "@/store/usePanelStore";

export type AgentTabsProps = {
  // The conversation this input belongs to. Sub-agent presence is scoped to it.
  claudeSessionId: string | null;
  // The conversation's own (main/orchestrator) agent name — excluded from tabs,
  // because the orchestrator IS the conversation (its activity is the chat).
  orchestratorName: string;
};

// Presence row above the editor: one tab per sub-agent seen in this
// conversation. Dot reuses the AgentRow pattern (pulsing colored dot when
// active, static otherwise). Clicking a tab opens/focuses that agent's live
// activity view in the right panel (UtilityPanel). Renders nothing when the
// conversation has no sub-agents.
export function AgentTabs({ claudeSessionId, orchestratorName }: AgentTabsProps) {
  const agents = useConversationAgents(claudeSessionId, orchestratorName);
  const openPanel = usePanelStore((s) => s.open);
  const dismiss = useAgentDismissStore((s) => s.dismiss);
  if (agents.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-3 pb-2">
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
        className="flex items-center justify-center w-6 h-6 rounded-md cursor-pointer transition-colors hover:bg-surface-3"
        style={{
          background: "var(--color-surface-2)",
          color: "var(--color-text-secondary)",
          border: "1px solid var(--color-border)",
        }}
      >
        <Network size={12} />
      </button>
      {agents.map((agent) => {
        const pulse = CONVERSATION_AGENT_DOT[agent.status].pulse;
        const dotClass = pulse
          ? "bg-active"
          : colorMap[agent.color] || "bg-surface-3";
        return (
          <div
            key={agent.name}
            className="group flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-md text-xs transition-colors"
            style={{
              background: "var(--color-surface-2)",
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
            }}
          >
            <button
              type="button"
              onClick={() =>
                openPanel({
                  id: agentTabId(agent.name, claudeSessionId),
                  kind: PanelTabKind.Agent,
                  title: agent.name,
                  payload: { agentName: agent.name, claudeSessionId },
                })
              }
              className="flex items-center gap-1.5 cursor-pointer hover:text-fg transition-colors"
            >
              <StatusDot
                data-testid={`agent-tab-dot-${agent.name}`}
                size="sm"
                pulse={pulse}
                className={dotClass}
              />
              <span className="truncate max-w-[140px] font-medium">{agent.name}</span>
            </button>
            <button
              type="button"
              aria-label={`Dismiss ${agent.name}`}
              data-testid={`agent-tab-dismiss-${agent.name}`}
              onClick={() => dismiss(claudeSessionId, agent.name, agent.latestSeq)}
              className="flex items-center justify-center w-4 h-4 rounded cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface-3"
              style={{ color: "var(--color-text-muted)" }}
            >
              <X size={11} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
