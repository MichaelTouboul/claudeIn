import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { WorkflowBoard } from '@/components/Dashboard/Workspace/DashboardArea/Dashboard/UtilityPanel/WorkflowView/WorkflowBoard';
import type { WorkflowAgent } from '@/hooks/useSessionWorkflow';
import { AgentPresenceStatus } from '@/store/dashboard/useEventsStore';

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
  workflowAgent({ agentName: 'worker', status: AgentPresenceStatus.Active, tool: 'Edit', tokensIn: 100, tokensOut: 40 }),
  workflowAgent({ agentName: 'asker', status: AgentPresenceStatus.Waiting, tool: 'Bash' }),
  workflowAgent({ agentName: 'sleeper', status: AgentPresenceStatus.Idle }),
];

describe('WorkflowBoard', () => {
  it('renders the three status groups with their labels', () => {
    render(<WorkflowBoard agents={agents} onSelectAgent={() => {}} />);

    expect(screen.getByRole('group', { name: 'Working' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Waiting' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Idle' })).toBeInTheDocument();
  });

  it('places each agent under the group matching its status', () => {
    render(<WorkflowBoard agents={agents} onSelectAgent={() => {}} />);

    const working = screen.getByRole('group', { name: 'Working' });
    const waiting = screen.getByRole('group', { name: 'Waiting' });
    const idle = screen.getByRole('group', { name: 'Idle' });

    expect(within(working).getByRole('button', { name: /worker/ })).toBeInTheDocument();
    expect(within(waiting).getByRole('button', { name: /asker/ })).toBeInTheDocument();
    expect(within(idle).getByRole('button', { name: /sleeper/ })).toBeInTheDocument();
  });

  it('shows the current tool and total token count on a card', () => {
    render(<WorkflowBoard agents={agents} onSelectAgent={() => {}} />);

    const card = screen.getByRole('button', { name: /worker/ });
    expect(card).toHaveTextContent('Edit');
    // tokensIn + tokensOut = 140
    expect(card).toHaveTextContent('140');
  });

  it('calls onSelectAgent with the agent name when a card is clicked', () => {
    const onSelectAgent = vi.fn();
    render(<WorkflowBoard agents={agents} onSelectAgent={onSelectAgent} />);

    fireEvent.click(screen.getByRole('button', { name: /asker/ }));

    expect(onSelectAgent).toHaveBeenCalledWith('asker');
  });
});
