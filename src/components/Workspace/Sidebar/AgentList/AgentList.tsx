import type { AgentSummary } from '@/lib/types';

import { AgentRow } from '../AgentRow/AgentRow';

export type AgentListProps = {
  agents: AgentSummary[];
  selectedId: string | null;
  onSelect: (a: AgentSummary) => void;
  onAgentAction: (action: string, agentName: string) => void;
};

export function AgentList({
  agents,
  selectedId,
  onSelect,
  onAgentAction,
}: AgentListProps) {
  // Flat, browsable list of the DEFINED agents passed in (Pillar 2) — no live
  // tree. Live agent activity now lives on the chat-input presence tabs + the
  // right panel, so the sidebar no longer nests orchestrators over their
  // sub-agents; each agent is one row. The caller already supplies the agents to
  // show (each appearing once), so there is nothing to dedup here.
  return (
    <div className="space-y-0.5">
      {agents.map((a) => (
        <AgentRow
          key={a.id}
          agent={a}
          selected={selectedId === a.id}
          onSelect={onSelect}
          onAgentAction={onAgentAction}
        />
      ))}
    </div>
  );
}
