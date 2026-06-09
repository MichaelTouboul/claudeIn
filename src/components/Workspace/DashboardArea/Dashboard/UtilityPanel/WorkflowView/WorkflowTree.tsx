import type { WorkflowAgent } from '@/hooks/useSessionWorkflow';

import { AGENT_PRESENTATION } from './agentPresentation';
import type { WorkflowViewProps } from './types';

function TreeAgentNode({
  agent,
  onSelectAgent,
}: {
  agent: WorkflowAgent;
  onSelectAgent: WorkflowViewProps['onSelectAgent'];
}) {
  const presentation = AGENT_PRESENTATION[agent.status];
  return (
    <li role="treeitem" aria-label={agent.agentName} className="relative pl-5">
      {/* CSS connector from the root spine to this node. */}
      <span
        aria-hidden
        className="absolute left-0 top-1/2 h-px w-4"
        style={{ background: 'var(--color-border)' }}
      />
      <button
        type="button"
        onClick={() => onSelectAgent(agent.agentName)}
        className="flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors hover:bg-surface-2"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
      >
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: presentation.colorVar }}
        />
        <span className="truncate font-medium">{agent.agentName}</span>
        <span className="ml-auto truncate font-mono" style={{ color: 'var(--color-text-muted)' }}>
          {agent.tool ?? '—'}
        </span>
      </button>
    </li>
  );
}

/**
 * Tree view: a single session-root node with one child node per agent — a flat
 * depth-1 fan (the derived data carries no parent links, so NO parent inference).
 * Each child shows its status dot (color from the shared {@link AGENT_PRESENTATION}
 * map) and current tool; clicking a node opens that agent's tab via
 * `onSelectAgent`. Connector lines are pure CSS, colored with design-system vars.
 */
export function WorkflowTree({ agents, onSelectAgent }: WorkflowViewProps) {
  return (
    <div role="tabpanel" aria-label="Tree" className="min-h-0 flex-1 overflow-auto p-3">
      <ul role="tree" className="flex flex-col gap-1">
        <li role="treeitem" aria-label="Session">
          <div
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: 'var(--color-accent)' }}
            />
            Session
          </div>
          <ul
            role="group"
            className="ml-3 mt-1 flex flex-col gap-1 border-l"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {agents.map((agent) => (
              <TreeAgentNode key={agent.agentName} agent={agent} onSelectAgent={onSelectAgent} />
            ))}
          </ul>
        </li>
      </ul>
    </div>
  );
}
