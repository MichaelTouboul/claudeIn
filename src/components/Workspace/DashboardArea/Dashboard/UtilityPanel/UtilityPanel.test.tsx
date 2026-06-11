import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useEventsStore } from '@/store/useEventsStore';
import { agentTabId, type PanelTab, PanelTabKind, usePanelStore } from '@/store/usePanelStore';

import { UtilityPanel } from './UtilityPanel';

const tableObject: PanelTab = {
  id: 't1',
  kind: PanelTabKind.Table,
  title: 'Table',
  payload: { columns: [{ field: 'name', headerName: 'Name' }], rows: [{ id: 0, name: 'Alice' }] },
};

beforeEach(() => {
  usePanelStore.setState({ isOpen: false, current: null, width: 480 });
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
  it('renders nothing when the panel is closed (chat reclaims width)', () => {
    const { container } = render(<UtilityPanel />);
    expect(container.firstChild).toBeNull();
  });

  it('renders inline (a region, NOT a dialog/portal overlay) when open', () => {
    usePanelStore.setState({ isOpen: true, current: tableObject });
    render(<UtilityPanel />);
    // Inline panel exposes a region, not a dialog overlay.
    expect(screen.getByRole('region', { name: 'Panel' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the empty state when open with no object', () => {
    usePanelStore.setState({ isOpen: true, current: null });
    render(<UtilityPanel />);
    expect(screen.getByText('Open a table from a response to start.')).toBeInTheDocument();
  });

  it('renders the current table object and its title (no tabs)', () => {
    usePanelStore.setState({ isOpen: true, current: tableObject });
    render(<UtilityPanel />);
    expect(screen.getByText('Alice')).not.toBeNull();
    expect(screen.getByText('Table')).toBeInTheDocument();
    // No tablist UI — the panel is single-object.
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('opening a second object REPLACES the first (single-object, no tabs)', () => {
    usePanelStore.setState({ isOpen: true, current: tableObject });
    const { rerender } = render(<UtilityPanel />);
    expect(screen.getByText('Alice')).toBeInTheDocument();

    act(() =>
      usePanelStore.getState().open({
        id: 'c1',
        kind: PanelTabKind.Code,
        title: 'Code',
        payload: { lang: 'ts', src: 'const z = 9;' },
      }),
    );
    rerender(<UtilityPanel />);
    // The former table is gone; the code object's content + title show instead.
    expect(screen.queryByText('Alice')).toBeNull();
    expect(screen.getByText('Code')).toBeInTheDocument();
    expect(screen.getByText('const z = 9;')).toBeInTheDocument();
  });

  it('the close button hides the panel (keeping its accessible name)', () => {
    usePanelStore.setState({ isOpen: true, current: tableObject });
    render(<UtilityPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Close panel' }));
    expect(usePanelStore.getState().isOpen).toBe(false);
  });

  it('renders the WorkflowView for a Workflow object', () => {
    usePanelStore.setState({
      isOpen: true,
      current: {
        id: 'w1',
        kind: PanelTabKind.Workflow,
        title: 'Session overview',
        payload: { claudeSessionId: 'sess-1' },
      },
    });
    render(<UtilityPanel />);
    expect(screen.getByRole('tab', { name: 'Timeline' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Board' })).toBeInTheDocument();
  });

  it('replaces the panel with an Agent object when a Workflow agent is selected', () => {
    usePanelStore.setState({
      isOpen: true,
      current: {
        id: 'w1',
        kind: PanelTabKind.Workflow,
        title: 'Session overview',
        payload: { claudeSessionId: 'sess-1' },
      },
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

    const cur = usePanelStore.getState().current;
    expect(cur?.id).toBe(agentTabId('researcher', 'sess-1'));
    expect(cur?.kind).toBe(PanelTabKind.Agent);
    if (cur?.kind !== PanelTabKind.Agent) throw new Error('not an agent object');
    expect(cur.payload).toEqual({ agentName: 'researcher', claudeSessionId: 'sess-1' });
  });

  it('clears the drag body styles when the panel closes mid-drag', () => {
    usePanelStore.setState({ isOpen: true, current: tableObject });
    render(<UtilityPanel />);

    fireEvent.mouseDown(screen.getByRole('separator', { name: 'Resize panel' }));
    expect(document.body.style.cursor).toBe('col-resize');
    expect(document.body.style.userSelect).toBe('none');

    act(() => usePanelStore.setState({ isOpen: false }));
    expect(document.body.style.cursor).toBe('');
    expect(document.body.style.userSelect).toBe('');
  });

  it('exposes the resize separator with ARIA value bounds', () => {
    usePanelStore.setState({ isOpen: true, width: 480, current: tableObject });
    render(<UtilityPanel />);
    const handle = screen.getByRole('separator', { name: 'Resize panel' });
    expect(handle.getAttribute('aria-valuenow')).toBe('480');
    expect(handle.getAttribute('aria-valuemin')).toBe('320');
    expect(handle.getAttribute('aria-valuemax')).toBe('1440');
  });

  it('keyboard ArrowLeft widens and ArrowRight narrows the panel', () => {
    usePanelStore.setState({ isOpen: true, width: 480, current: tableObject });
    render(<UtilityPanel />);
    const handle = screen.getByRole('separator', { name: 'Resize panel' });

    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(usePanelStore.getState().width).toBe(504);

    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(usePanelStore.getState().width).toBe(480);
  });
});
