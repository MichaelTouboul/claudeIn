import type { AgentContext } from '@/hooks/useIPC';
import type { AgentFile } from '@/types/agent.types';

import { AgentRow } from '../AgentRow/AgentRow';
import { OrchestratorTree } from '../OrchestratorTree/OrchestratorTree';

export type AgentListProps = {
  agents: AgentFile[];
  allAgents: AgentFile[];
  selectedId: string | null;
  onSelect: (a: AgentFile) => void;
  onAgentAction: (action: string, agentName: string) => void;
  onToggleLink?: (name: string) => void;
  linkAction?: "link" | "unlink";
  isAgentFavorite?: (name: string) => boolean;
  activeAgents?: Set<string>;
  agentContexts?: Map<string, AgentContext>;
};

export function AgentList({
  agents,
  allAgents,
  selectedId,
  onSelect,
  onAgentAction,
  onToggleLink,
  linkAction,
  isAgentFavorite,
  activeAgents,
  agentContexts,
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
          onToggleLink={onToggleLink}
          linkAction={linkAction}
          isAgentFavorite={isAgentFavorite}
          activeAgents={activeAgents}
          agentContexts={agentContexts}
        />
      ))}
      {standalones.map((a) => (
        <AgentRow
          key={a.id}
          agent={a}
          selected={selectedId === a.id}
          active={activeAgents?.has(a.id)}
          context={agentContexts?.get(a.id)}
          onSelect={onSelect}
          onAgentAction={onAgentAction}
          onToggleLink={onToggleLink}
          linkAction={linkAction}
          isAgentFavorite={isAgentFavorite}
        />
      ))}
    </div>
  );
}
