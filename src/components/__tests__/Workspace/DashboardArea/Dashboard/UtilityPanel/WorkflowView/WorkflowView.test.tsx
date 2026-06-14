import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkflowView } from '@/components/Workspace/DashboardArea/Dashboard/UtilityPanel/WorkflowView/WorkflowView';
import type { LiveEvent } from '@/lib/types';
import { useEventsStore } from '@/store/dashboard/useEventsStore';
import { useWorkflowViewStore, WorkflowViewKind } from '@/store/dashboard/useWorkflowViewStore';

function liveEvent(over: Partial<LiveEvent>): LiveEvent {
  return {
    id: 1,
    agent_name: 'agent',
    session_id: 'sess-1',
    event_type: 'PreToolUse',
    tool_name: null,
    tokens_in: 0,
    tokens_out: 0,
    cost_usd: 0,
    created_at: '2026-06-09T00:00:00.000Z',
    ...over,
  };
}

function ingestEvent(over: Partial<LiveEvent>) {
  useEventsStore.getState().ingest({ type: 'event', ...liveEvent(over) });
}

beforeEach(() => {
  useEventsStore.setState({
    events: [],
    activeAgents: new Set(),
    waitingAgents: new Set(),
    agentContexts: new Map(),
    currentTools: new Map(),
    presence: new Map(),
    presenceSeq: new Map(),
  });
  useWorkflowViewStore.setState({ view: WorkflowViewKind.Timeline });
});

describe('WorkflowView', () => {
  it('renders the switcher and the default Timeline region', () => {
    render(<WorkflowView claudeSessionId="sess-1" onSelectAgent={() => {}} />);

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tabpanel', { name: 'Timeline' })).toBeInTheDocument();
    expect(screen.queryByRole('tabpanel', { name: 'Board' })).not.toBeInTheDocument();
  });

  it('swaps the rendered region when the store view changes', () => {
    render(<WorkflowView claudeSessionId="sess-1" onSelectAgent={() => {}} />);

    act(() => useWorkflowViewStore.getState().setView(WorkflowViewKind.Board));

    expect(screen.getByRole('tabpanel', { name: 'Board' })).toBeInTheDocument();
    expect(screen.queryByRole('tabpanel', { name: 'Timeline' })).not.toBeInTheDocument();
  });

  it('lists the session agents and calls onSelectAgent when one is clicked', () => {
    ingestEvent({ id: 1, agent_name: 'researcher', session_id: 'sess-1' });
    const onSelectAgent = vi.fn();

    render(<WorkflowView claudeSessionId="sess-1" onSelectAgent={onSelectAgent} />);
    fireEvent.click(screen.getByRole('button', { name: /researcher/ }));

    expect(onSelectAgent).toHaveBeenCalledWith('researcher');
  });
});
