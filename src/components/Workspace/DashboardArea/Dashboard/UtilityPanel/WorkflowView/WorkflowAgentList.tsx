import { AGENT_PRESENTATION } from './agentPresentation';
import type { WorkflowViewProps } from './types';

/**
 * Minimal shared agent listing used by the Phase-3 view stubs (Timeline / Tree /
 * Board) until Phase 4 fleshes each out. Renders one clickable row per agent —
 * the accessible name is the agent name so a click maps cleanly to
 * `onSelectAgent(agentName)`. Status color comes from the shared
 * {@link AGENT_PRESENTATION} behavior map, not a fallback chain.
 */
export function WorkflowAgentList({ agents, onSelectAgent }: WorkflowViewProps) {
  if (agents.length === 0) {
    return (
      <p className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        No agents in this session yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1 p-3">
      {agents.map((agent) => {
        const presentation = AGENT_PRESENTATION[agent.status];
        return (
          <li key={agent.agentName}>
            <button
              type="button"
              onClick={() => onSelectAgent(agent.agentName)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-surface-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: presentation.colorVar }}
              />
              <span className="truncate font-medium">{agent.agentName}</span>
              <span
                className="ml-auto text-[10px] uppercase tracking-wide"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {presentation.label}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
