import { StatusDot } from '@/components/_ui/StatusDot';
import type { WorkflowAgent } from '@/hooks/useSessionWorkflow';
import { AgentPresenceStatus } from '@/store/useEventsStore';

import { AGENT_PRESENTATION } from './agentPresentation';
import type { RunTimeRange } from './segmentGeometry';
import { placeSegment, runTimeRange, toolColorVar } from './segmentGeometry';
import type { WorkflowViewProps } from './types';

function TimelineLane({
  agent,
  range,
  onSelectAgent,
}: {
  agent: WorkflowAgent;
  range: RunTimeRange;
  onSelectAgent: WorkflowViewProps['onSelectAgent'];
}) {
  const presentation = AGENT_PRESENTATION[agent.status];
  const isWaiting = agent.status === AgentPresenceStatus.Waiting;

  return (
    <button
      type="button"
      onClick={() => onSelectAgent(agent.agentName)}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-surface-2"
      style={{ color: 'var(--color-text-primary)' }}
    >
      <span className="flex w-24 shrink-0 items-center gap-1.5">
        <StatusDot
          size="sm"
          pulse={presentation.dot}
          style={{ background: presentation.colorVar }}
        />
        <span className="truncate font-medium">{agent.agentName}</span>
      </span>
      <span
        className="relative h-4 flex-1 overflow-hidden rounded"
        style={{ background: 'var(--color-surface-2)' }}
      >
        {agent.segments.map((segment) => {
          const { leftPct, widthPct } = placeSegment(segment, range);
          return (
            <span
              key={`${segment.startMs}:${segment.tool ?? 'idle'}`}
              data-testid="timeline-segment"
              title={segment.tool ?? 'idle'}
              className="absolute top-0 h-full rounded-sm"
              style={{
                left: `${leftPct}%`,
                width: `${widthPct}%`,
                background: toolColorVar(segment.tool),
              }}
            />
          );
        })}
        {isWaiting ? (
          <span
            data-testid="timeline-waiting-marker"
            aria-label="waiting"
            className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px]"
            style={{ color: 'var(--color-accent)' }}
          >
            ⏸
          </span>
        ) : null}
      </span>
    </button>
  );
}

/**
 * Timeline view: one swimlane per agent. Each lane draws the agent's tool-spans as
 * blocks positioned/sized from {@link placeSegment} (normalized across the whole
 * run's min→max time via {@link runTimeRange}) and colored by tool. A single "now"
 * marker pins the right edge (the run's latest moment); a waiting agent shows a
 * waiting marker on its lane. Clicking a lane opens that agent's tab via
 * `onSelectAgent`.
 */
export function WorkflowTimeline({ agents, onSelectAgent }: WorkflowViewProps) {
  const range = runTimeRange(agents.map((agent) => agent.segments));

  return (
    <div role="tabpanel" aria-label="Timeline" className="min-h-0 flex-1 overflow-auto p-3">
      <div className="relative flex flex-col gap-1">
        {agents.map((agent) => (
          <TimelineLane
            key={agent.agentName}
            agent={agent}
            range={range}
            onSelectAgent={onSelectAgent}
          />
        ))}
        {/* "now" marker: the right edge of the chart is the run's latest moment. */}
        <span
          data-testid="timeline-now-marker"
          aria-label="now"
          className="pointer-events-none absolute bottom-0 top-0 w-px"
          style={{ right: '0.75rem', background: 'var(--color-accent)' }}
        />
      </div>
    </div>
  );
}
