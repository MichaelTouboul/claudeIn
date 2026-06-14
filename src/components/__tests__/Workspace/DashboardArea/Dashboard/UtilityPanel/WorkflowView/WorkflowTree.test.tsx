import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { WorkflowTree } from '@/components/Workspace/DashboardArea/Dashboard/UtilityPanel/WorkflowView/WorkflowTree';
import type { WorkflowAgent } from '@/hooks/useSessionWorkflow';
import { AgentPresenceStatus } from '@/store/useEventsStore';

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
  workflowAgent({ agentName: 'alpha', status: AgentPresenceStatus.Active, tool: 'Edit' }),
  workflowAgent({ agentName: 'beta', status: AgentPresenceStatus.Waiting, tool: 'Bash' }),
];

describe('WorkflowTree', () => {
  it('renders one session-root node plus one child node per agent', () => {
    render(<WorkflowTree agents={agents} onSelectAgent={() => {}} />);

    expect(screen.getByRole('treeitem', { name: /session/i })).toBeInTheDocument();
    // depth-1 fan: a child node per agent
    expect(screen.getByRole('button', { name: /alpha/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /beta/ })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(agents.length);
  });

  it('shows the current tool on a child node', () => {
    render(<WorkflowTree agents={agents} onSelectAgent={() => {}} />);
    expect(screen.getByRole('button', { name: /alpha/ })).toHaveTextContent('Edit');
  });

  it('calls onSelectAgent with the agent name when a node is clicked', () => {
    const onSelectAgent = vi.fn();
    render(<WorkflowTree agents={agents} onSelectAgent={onSelectAgent} />);

    fireEvent.click(screen.getByRole('button', { name: /beta/ }));

    expect(onSelectAgent).toHaveBeenCalledWith('beta');
  });
});
