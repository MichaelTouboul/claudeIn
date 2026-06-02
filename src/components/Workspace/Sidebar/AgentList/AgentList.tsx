import type { AgentSummary } from '@/types/agents-mirror.types';

import { AgentRow } from '../AgentRow/AgentRow';
import { OrchestratorTree } from '../OrchestratorTree/OrchestratorTree';

export type AgentListProps = {
  agents: AgentSummary[];
  allAgents: AgentSummary[];
  selectedId: string | null;
  onSelect: (a: AgentSummary) => void;
  onAgentAction: (action: string, agentName: string) => void;
};

export function AgentList({
  agents,
  allAgents,
  selectedId,
  onSelect,
  onAgentAction,
}: AgentListProps) {
  const agentIds = new Set(allAgents.map((a) => a.id));
  const subAgentIds = new Set<string>();
  for (const a of agents) {
    for (const sub of a.subAgents) {
      if (agentIds.has(sub)) subAgentIds.add(sub);
    }
  }

  const orchestrators = agents.filter((a) => a.subAgents.length > 0);
  const standalones = agents.filter((a) => a.subAgents.length === 0 && !subAgentIds.has(a.id));

  return (
    <div className="space-y-0.5">
      {orchestrators.map((orch) => (
        <OrchestratorTree
          key={orch.id}
          orchestrator={orch}
          allAgents={allAgents}
          selectedId={selectedId}
          onSelect={onSelect}
          onAgentAction={onAgentAction}
        />
      ))}
      {standalones.map((a) => (
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
