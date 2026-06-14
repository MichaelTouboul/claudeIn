import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { WorkflowTimeline } from '@/components/Workspace/DashboardArea/Dashboard/UtilityPanel/WorkflowView/WorkflowTimeline';
import type { WorkflowAgent, WorkflowSegment } from '@/hooks/useSessionWorkflow';
import { AgentPresenceStatus } from '@/store/useEventsStore';

const seg = (startMs: number, endMs: number, tool: string | null = 'Read'): WorkflowSegment => ({
  tool,
  startMs,
  endMs,
});

function workflowAgent(over: Partial<WorkflowAgent> & { agentName: string }): WorkflowAgent {
  return {
    status: AgentPresenceStatus.Idle,
    tool: null,
    tokensIn: 0,
    tokensOut: 0,
    costUsd: 0,
    segments: [],
    latestSeq: 0,
    ...over,
  };
}

const agents: WorkflowAgent[] = [
  workflowAgent({
    agentName: 'alpha',
    status: AgentPresenceStatus.Active,
    segments: [seg(0, 50, 'Read'), seg(50, 100, 'Edit')],
  }),
  workflowAgent({
    agentName: 'beta',
    status: AgentPresenceStatus.Waiting,
    segments: [seg(20, 60, 'Bash')],
  }),
];

describe('WorkflowTimeline', () => {
  it('renders one lane per agent', () => {
    render(<WorkflowTimeline agents={agents} onSelectAgent={() => {}} />);
    expect(screen.getByRole('button', { name: /alpha/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /beta/ })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(agents.length);
  });

  it('renders one segment element per segment within a lane', () => {
    render(<WorkflowTimeline agents={agents} onSelectAgent={() => {}} />);
    const alphaLane = screen.getByRole('button', { name: /alpha/ });
    // alpha has two segments
    expect(within(alphaLane).getAllByTestId('timeline-segment')).toHaveLength(2);
  });

  it('shows a now marker', () => {
    render(<WorkflowTimeline agents={agents} onSelectAgent={() => {}} />);
    expect(screen.getByTestId('timeline-now-marker')).toBeInTheDocument();
  });

  it('shows a waiting marker on a waiting agent lane', () => {
    render(<WorkflowTimeline agents={agents} onSelectAgent={() => {}} />);
    const betaLane = screen.getByRole('button', { name: /beta/ });
    expect(within(betaLane).getByTestId('timeline-waiting-marker')).toBeInTheDocument();
  });

  it('does not show a waiting marker on a non-waiting lane', () => {
    render(<WorkflowTimeline agents={agents} onSelectAgent={() => {}} />);
    const alphaLane = screen.getByRole('button', { name: /alpha/ });
    expect(within(alphaLane).queryByTestId('timeline-waiting-marker')).not.toBeInTheDocument();
  });

  it('calls onSelectAgent with the agent name when a lane is clicked', () => {
    const onSelectAgent = vi.fn();
    render(<WorkflowTimeline agents={agents} onSelectAgent={onSelectAgent} />);

    fireEvent.click(screen.getByRole('button', { name: /alpha/ }));

    expect(onSelectAgent).toHaveBeenCalledWith('alpha');
  });
});
