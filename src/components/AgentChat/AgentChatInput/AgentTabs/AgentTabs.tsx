import { colorMap } from "@/components/Workspace/utils";
import {
  CONVERSATION_AGENT_DOT,
  useConversationAgents,
} from "@/hooks/useConversationAgents";

export type AgentTabsProps = {
  // The conversation this input belongs to. Sub-agent presence is scoped to it.
  claudeSessionId: string | null;
  // The conversation's own (main/orchestrator) agent name — excluded from tabs,
  // because the orchestrator IS the conversation (its activity is the chat).
  orchestratorName: string;
};

// Presence row above the editor: one tab per sub-agent seen in this
// conversation. Dot reuses the AgentRow pattern (pulsing colored dot when
// active, static otherwise). No click / no × yet (Phase 2/3). Renders nothing
// when the conversation has no sub-agents.
export function AgentTabs({ claudeSessionId, orchestratorName }: AgentTabsProps) {
  const agents = useConversationAgents(claudeSessionId, orchestratorName);
  if (agents.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-3 pb-2">
      {agents.map((agent) => {
        const pulse = CONVERSATION_AGENT_DOT[agent.status].pulse;
        const dotClass = pulse
          ? "bg-active animate-pulse"
          : colorMap[agent.color] || "bg-surface-3";
        return (
          <div
            key={agent.name}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs"
            style={{
              background: "var(--color-surface-2)",
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
            }}
          >
            <span
              data-testid={`agent-tab-dot-${agent.name}`}
              className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`}
            />
            <span className="truncate max-w-[140px] font-medium">{agent.name}</span>
          </div>
        );
      })}
    </div>
  );
}
