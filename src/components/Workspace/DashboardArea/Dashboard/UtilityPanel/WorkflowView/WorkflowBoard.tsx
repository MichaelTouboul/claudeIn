import { Inline } from '@/components/_ui/Inline';
import { Stack } from '@/components/_ui/Stack';
import { StatusDot } from '@/components/_ui/StatusDot';
import type { WorkflowAgent } from '@/hooks/useSessionWorkflow';
import { AgentPresenceStatus } from '@/store/useEventsStore';

import { AGENT_PRESENTATION } from './agentPresentation';
import type { WorkflowViewProps } from './types';

/**
 * Board column order, defined ONCE (CLAUDE.md: enum + behavior map, not a chain).
 * The board renders one labelled group per status in THIS order — Working first
 * so the eye lands on what is live. The label comes from the shared
 * {@link AGENT_PRESENTATION} map, so a status's name lives in a single place.
 */
const BOARD_GROUP_ORDER: AgentPresenceStatus[] = [
  AgentPresenceStatus.Active,
  AgentPresenceStatus.Waiting,
  AgentPresenceStatus.Idle,
];

function totalTokens(agent: WorkflowAgent): number {
  return agent.tokensIn + agent.tokensOut;
}

function BoardCard({ agent, onSelectAgent }: { agent: WorkflowAgent; onSelectAgent: WorkflowViewProps['onSelectAgent'] }) {
  const presentation = AGENT_PRESENTATION[agent.status];
  return (
    <Stack
      as="button"
      gap={1}
      type="button"
      onClick={() => onSelectAgent(agent.agentName)}
      className="w-full rounded-md border px-2.5 py-2 text-left text-xs transition-colors hover:bg-surface-2"
      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
    >
      <Inline as="span" gap={2}>
        <StatusDot
          size="sm"
          pulse={presentation.dot}
          style={{ background: presentation.colorVar }}
        />
        <span className="truncate font-medium">{agent.agentName}</span>
      </Inline>
      <Inline as="span" gap={2} justify="between" style={{ color: 'var(--color-text-muted)' }}>
        <span className="truncate font-mono">{agent.tool ?? '—'}</span>
        <span className="shrink-0 tabular-nums">{totalTokens(agent).toLocaleString()} tok</span>
      </Inline>
    </Stack>
  );
}

function BoardGroup({
  status,
  agents,
  onSelectAgent,
}: {
  status: AgentPresenceStatus;
  agents: WorkflowAgent[];
  onSelectAgent: WorkflowViewProps['onSelectAgent'];
}) {
  const { label } = AGENT_PRESENTATION[status];
  return (
    <section role="group" aria-label={label} className="flex min-w-0 flex-1 flex-col gap-2">
      <h3
        className="text-[10px] font-semibold uppercase tracking-wide"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {label} ({agents.length})
      </h3>
      <div className="flex flex-col gap-1.5">
        {agents.map((agent) => (
          <BoardCard key={agent.agentName} agent={agent} onSelectAgent={onSelectAgent} />
        ))}
      </div>
    </section>
  );
}

/**
 * Board view: agents grouped into Working / Waiting / Idle columns of cards, each
 * card showing the agent's current tool and total token count. Clicking a card
 * opens that agent's tab via `onSelectAgent`. Group order/labels are driven by
 * {@link BOARD_GROUP_ORDER} + {@link AGENT_PRESENTATION}, never a fallback chain.
 */
export function WorkflowBoard({ agents, onSelectAgent }: WorkflowViewProps) {
  const byStatus: Record<AgentPresenceStatus, WorkflowAgent[]> = {
    [AgentPresenceStatus.Active]: [],
    [AgentPresenceStatus.Waiting]: [],
    [AgentPresenceStatus.Idle]: [],
  };
  for (const agent of agents) byStatus[agent.status].push(agent);

  return (
    <div role="tabpanel" aria-label="Board" className="min-h-0 flex-1 overflow-auto p-3">
      <div className="flex gap-3">
        {BOARD_GROUP_ORDER.map((status) => (
          <BoardGroup
            key={status}
            status={status}
            agents={byStatus[status]}
            onSelectAgent={onSelectAgent}
          />
        ))}
      </div>
    </div>
  );
}
