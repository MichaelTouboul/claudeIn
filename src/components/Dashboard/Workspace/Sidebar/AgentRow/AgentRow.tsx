import { Boxes } from 'lucide-react';

import { ContextBar } from '@/components/_ui/ContextBar';
import { AgentContextMenu } from '@/components/Dashboard/AgentContextMenu/AgentContextMenu';
import { useProject } from '@/contexts/ProjectContext';
import type { AgentSummary } from '@/lib/types';
import { contextPercentForAgent } from '@/store/dashboard/sessionContext';
import { useEventsStore } from '@/store/dashboard/useEventsStore';
import { useFavoritesStore } from '@/store/dashboard/useFavoritesStore';

import { AgentTile } from '../AgentsZone/AgentTile/AgentTile';

export type AgentRowProps = {
  agent: AgentSummary;
  selected: boolean;
  onSelect: (a: AgentSummary) => void;
  onAgentAction: (action: string, agentName: string) => void;
};

/** Strip the conventional `-pack` suffix so the badge reads compactly. */
function shortSource(source: string): string {
  return source.replace(/-pack$/, '');
}

export function AgentRow({ agent, selected, onSelect, onAgentAction }: AgentRowProps) {
  const { projectId } = useProject();
  const active = useEventsStore((s) => s.activeAgents.has(agent.id));
  const context = useEventsStore((s) => s.agentContexts.get(agent.id));
  // The bar percent is the ONE backend value for this agent's live session(s),
  // identical to the sidebar row's number for the same conversation.
  const percent = useEventsStore((s) => contextPercentForAgent(s.presence, s.sessionContexts, agent.id));
  const isFavorite = useFavoritesStore((s) =>
    (s.byProject[projectId ?? ''] || []).some((f) => f.item_type === 'agent' && f.item_name === agent.id),
  );

  return (
    <div
      className="group flex items-center gap-2.5 px-2.5 py-2 mx-2 rounded-md overflow-hidden hover:bg-surface-2 transition-colors"
      style={selected ? { background: 'var(--color-accent-subtle)' } : undefined}
    >
      <button
        type="button"
        onClick={() => onSelect(agent)}
        className="relative flex flex-1 items-center gap-2.5 min-w-0 text-left"
      >
        {active && percent !== null && percent > 0 ? (
          <ContextBar
            percent={percent}
            tokensIn={context?.tokensIn ?? 0}
            tokensOut={context?.tokensOut ?? 0}
            costUsd={context?.costUsd ?? 0}
          />
        ) : null}
        <AgentTile color={agent.frontmatter.color} running={active} />
        <span className="relative flex-1 min-w-0">
          <span className="flex items-center gap-1.5">
            <span
              className="truncate text-[13px] font-medium"
              style={{ color: selected ? 'var(--color-accent-text)' : 'var(--color-fg)' }}
            >
              {agent.id}
            </span>
            {active ? (
              <span className="shrink-0 text-[10.5px] font-semibold" style={{ color: 'var(--color-active)' }}>
                running
              </span>
            ) : null}
          </span>
          <span className="block truncate text-xs mt-px" style={{ color: 'var(--color-text-muted)' }}>
            {agent.frontmatter.description}
          </span>
        </span>
      </button>

      {/* Source badge by default → hidden on hover; the ••• menu reveals on hover. */}
      {agent.source ? (
        <span
          title={agent.source}
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 group-hover:hidden"
          style={{ background: 'var(--color-surface-inset)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          <Boxes size={11} />
          <span className="font-mono text-[10.5px] whitespace-nowrap">{shortSource(agent.source)}</span>
        </span>
      ) : null}
      <div className={`shrink-0 ${agent.source ? 'hidden group-hover:block' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
        <AgentContextMenu
          agentName={agent.id}
          isOrchestrator={agent.subAgents.length > 0}
          isFavorite={isFavorite}
          onAction={onAgentAction}
        />
      </div>
    </div>
  );
}
