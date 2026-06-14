import { ContextBar } from '@/components/_ui/ContextBar';
import { StatusDot } from '@/components/_ui/StatusDot';
import { AgentContextMenu } from '@/components/Dashboard/AgentContextMenu/AgentContextMenu';
import { useProject } from '@/contexts/ProjectContext';
import type { AgentSummary } from '@/lib/types';
import { useEventsStore } from '@/store/dashboard/useEventsStore';
import { useFavoritesStore } from '@/store/dashboard/useFavoritesStore';

import { colorMap } from '../../utils';

export type AgentRowProps = {
  agent: AgentSummary;
  selected: boolean;
  onSelect: (a: AgentSummary) => void;
  onAgentAction: (action: string, agentName: string) => void;
};

export function AgentRow({
  agent,
  selected,
  onSelect,
  onAgentAction,
}: AgentRowProps) {
  const { projectId } = useProject();
  const active = useEventsStore((s) => s.activeAgents.has(agent.id));
  const context = useEventsStore((s) => s.agentContexts.get(agent.id));
  const isFavorite = useFavoritesStore((s) =>
    (s.byProject[projectId ?? ''] || []).some((f) => f.item_type === 'agent' && f.item_name === agent.id)
  );
  return (
    <div className="flex items-center group">
      <button
        onClick={() => onSelect(agent)}
        className={`relative flex-1 flex items-center gap-2 px-3 py-2 rounded-lg transition-colors overflow-hidden ${
          selected ? "bg-surface-3 text-fg" : "text-fg hover:bg-surface-2"
        }`}
      >
        {active && context && context.percent > 0 ? <ContextBar percent={context.percent} tokensIn={context.tokensIn} tokensOut={context.tokensOut} costUsd={context.costUsd} /> : null}
        <StatusDot
          size="sm"
          pulse={active}
          className={`relative ${active ? "bg-active" : (colorMap[agent.frontmatter.color || ""] || "bg-surface-3")}`}
        />
        <span className="relative truncate text-sm font-medium">{agent.id}</span>
      </button>
      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <AgentContextMenu agentName={agent.id} isOrchestrator={agent.subAgents.length > 0} isFavorite={isFavorite} onAction={onAgentAction} />
      </div>
    </div>
  );
}
