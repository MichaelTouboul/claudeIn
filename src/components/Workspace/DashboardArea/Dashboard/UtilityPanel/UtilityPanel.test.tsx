import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useEventsStore } from '@/store/useEventsStore';
import { agentTabId, PanelTabKind, usePanelStore } from '@/store/usePanelStore';

import { UtilityPanel } from './UtilityPanel';

beforeEach(() => {
  usePanelStore.setState({ isOpen: false, tabs: [], activeTabId: null, width: 480 });
  useEventsStore.setState({
    events: [],
    activeAgents: new Set(),
    waitingAgents: new Set(),
    agentContexts: new Map(),
    currentTools: new Map(),
    presence: new Map(),
    presenceSeq: new Map(),
  });
  Object.defineProperty(window, 'innerWidth', { value: 1600, configurable: true });
});

afterEach(() => {
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
});

describe('UtilityPanel', () => {
  it('is not rendered when the panel is closed', () => {
    render(<UtilityPanel />);
    expect(screen.queryByText('Table')).toBeNull();
  });

  it('renders the active table tab when open', () => {
    usePanelStore.setState({
      isOpen: true,
      activeTabId: 't1',
      tabs: [
        {
          id: 't1',
          kind: PanelTabKind.Table,
          title: 'Table',
          payload: { columns: [{ field: 'name', headerName: 'Name' }], rows: [{ id: 0, name: 'Alice' }] },
        },
      ],
    });
    render(<UtilityPanel />);
    expect(screen.getByText('Alice')).not.toBeNull();
  });

  it('renders the WorkflowView for a Workflow tab', () => {
    usePanelStore.setState({
      isOpen: true,
      activeTabId: 'w1',
      tabs: [
        {
          id: 'w1',
          kind: PanelTabKind.Workflow,
          title: 'Session overview',
          payload: { claudeSessionId: 'sess-1' },
        },
      ],
    });
    render(<UtilityPanel />);
    // The WorkflowView mounts its switcher (a tablist of Timeline/Tree/Board).
    expect(screen.getByRole('tab', { name: 'Timeline' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Board' })).toBeInTheDocument();
  });

  it('opens/focuses an Agent tab when a Workflow agent is selected', () => {
    usePanelStore.setState({
      isOpen: true,
      activeTabId: 'w1',
      tabs: [
        {
          id: 'w1',
          kind: PanelTabKind.Workflow,
          title: 'Session overview',
          payload: { claudeSessionId: 'sess-1' },
        },
      ],
    });
    useEventsStore.getState().ingest({
      type: 'event',
      id: 1,
      agent_name: 'researcher',
      session_id: 'sess-1',
      event_type: 'PreToolUse',
      tool_name: null,
      tokens_in: 0,
      tokens_out: 0,
      cost_usd: 0,
      created_at: '2026-06-09T00:00:00.000Z',
    });
    render(<UtilityPanel />);

    fireEvent.click(screen.getByRole('button', { name: /researcher/ }));

    const s = usePanelStore.getState();
    const expectedId = agentTabId('researcher', 'sess-1');
    expect(s.activeTabId).toBe(expectedId);
    const tab = s.tabs.find((t) => t.id === expectedId);
    expect(tab?.kind).toBe(PanelTabKind.Agent);
    if (tab?.kind !== PanelTabKind.Agent) throw new Error('not an agent tab');
    expect(tab.payload).toEqual({ agentName: 'researcher', claudeSessionId: 'sess-1' });
  });

  it('clears the drag body styles when the panel closes mid-drag', () => {
    usePanelStore.setState({
      isOpen: true,
      activeTabId: 't1',
      tabs: [{ id: 't1', kind: PanelTabKind.Table, title: 'Table', payload: { columns: [], rows: [] } }],
    });
    render(<UtilityPanel />);

    // Begin a drag: the body picks up the resize cursor + text-select lock.
    fireEvent.mouseDown(screen.getByRole('separator', { name: 'Resize panel' }));
    expect(document.body.style.cursor).toBe('col-resize');
    expect(document.body.style.userSelect).toBe('none');

    // Close the panel mid-drag (e.g. the X button) — the content unmounts.
    act(() => usePanelStore.setState({ isOpen: false }));
    expect(document.body.style.cursor).toBe('');
    expect(document.body.style.userSelect).toBe('');
  });

  it('exposes the resize separator with ARIA value bounds', () => {
    usePanelStore.setState({
      isOpen: true,
      activeTabId: 't1',
      width: 480,
      tabs: [{ id: 't1', kind: PanelTabKind.Table, title: 'Table', payload: { columns: [], rows: [] } }],
    });
    render(<UtilityPanel />);
    const handle = screen.getByRole('separator', { name: 'Resize panel' });
    expect(handle.getAttribute('aria-valuenow')).toBe('480');
    expect(handle.getAttribute('aria-valuemin')).toBe('320');
    expect(handle.getAttribute('aria-valuemax')).toBe('1440');
  });

  it('keyboard ArrowLeft widens and ArrowRight narrows the panel', () => {
    usePanelStore.setState({
      isOpen: true,
      activeTabId: 't1',
      width: 480,
      tabs: [{ id: 't1', kind: PanelTabKind.Table, title: 'Table', payload: { columns: [], rows: [] } }],
    });
    render(<UtilityPanel />);
    const handle = screen.getByRole('separator', { name: 'Resize panel' });

    // Panel is docked right and grows leftward: ArrowLeft widens it.
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(usePanelStore.getState().width).toBe(504);

    // ArrowRight narrows it back.
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(usePanelStore.getState().width).toBe(480);
  });
});
