import { beforeEach, describe, expect, it } from 'vitest';

import { type PanelTab, PanelTabKind, tableTabId, usePanelStore } from './usePanelStore';

function tableTab(id: string, title = 'Table'): PanelTab {
  return { id, kind: PanelTabKind.Table, title, payload: { columns: [], rows: [] } };
}

beforeEach(() => {
  usePanelStore.setState({ isOpen: false, tabs: [], activeTabId: null });
});

describe('usePanelStore', () => {
  it('openTab adds a tab, focuses it, and opens the panel', () => {
    usePanelStore.getState().openTab(tableTab('a'));
    const s = usePanelStore.getState();
    expect(s.tabs.map((t) => t.id)).toEqual(['a']);
    expect(s.activeTabId).toBe('a');
    expect(s.isOpen).toBe(true);
  });

  it('openTab with an existing id does not duplicate, just refocuses', () => {
    const { openTab } = usePanelStore.getState();
    openTab(tableTab('a'));
    openTab(tableTab('b'));
    openTab(tableTab('a'));
    const s = usePanelStore.getState();
    expect(s.tabs.map((t) => t.id)).toEqual(['a', 'b']);
    expect(s.activeTabId).toBe('a');
  });

  it('closeTab removes the tab and reassigns active to the last remaining', () => {
    const { openTab, closeTab } = usePanelStore.getState();
    openTab(tableTab('a'));
    openTab(tableTab('b'));
    closeTab('b');
    expect(usePanelStore.getState().activeTabId).toBe('a');
    closeTab('a');
    expect(usePanelStore.getState().tabs).toEqual([]);
    expect(usePanelStore.getState().activeTabId).toBeNull();
  });

  it('closeTab closes the panel when the last tab is removed', () => {
    const { openTab, closeTab } = usePanelStore.getState();
    openTab(tableTab('a'));
    expect(usePanelStore.getState().isOpen).toBe(true);
    closeTab('a');
    const s = usePanelStore.getState();
    expect(s.tabs).toEqual([]);
    expect(s.isOpen).toBe(false);
  });

  it('closeTab keeps the panel open while tabs remain', () => {
    const { openTab, closeTab } = usePanelStore.getState();
    openTab(tableTab('a'));
    openTab(tableTab('b'));
    closeTab('b');
    expect(usePanelStore.getState().isOpen).toBe(true);
  });

  it('setActive / setOpen / togglePanel mutate flags', () => {
    const { openTab, setActive, setOpen, togglePanel } = usePanelStore.getState();
    openTab(tableTab('a'));
    openTab(tableTab('b'));
    setActive('a');
    expect(usePanelStore.getState().activeTabId).toBe('a');
    setOpen(false);
    expect(usePanelStore.getState().isOpen).toBe(false);
    togglePanel();
    expect(usePanelStore.getState().isOpen).toBe(true);
  });

  it('tableTabId is stable for identical content and differs otherwise', () => {
    const a = tableTabId({ columns: [{ field: 'x', headerName: 'X' }], rows: [{ id: 0, x: '1' }] });
    const b = tableTabId({ columns: [{ field: 'x', headerName: 'X' }], rows: [{ id: 0, x: '1' }] });
    const c = tableTabId({ columns: [{ field: 'x', headerName: 'X' }], rows: [{ id: 0, x: '2' }] });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it('openTab dedups identical content even when the same payload is reopened', () => {
    const { openTab } = usePanelStore.getState();
    const payload = { columns: [{ field: 'x', headerName: 'X' }], rows: [{ id: 0, x: '1' }] };
    const id = tableTabId(payload);
    openTab({ id, kind: PanelTabKind.Table, title: 'Table', payload });
    openTab({ id, kind: PanelTabKind.Table, title: 'Table', payload });
    const s = usePanelStore.getState();
    expect(s.tabs).toHaveLength(1);
    expect(s.activeTabId).toBe(id);
  });

  it('openTab never aliases distinct content to the same tab on an id collision', () => {
    const { openTab } = usePanelStore.getState();
    const payloadA = { columns: [{ field: 'x', headerName: 'X' }], rows: [{ id: 0, x: 'A' }] };
    const payloadB = { columns: [{ field: 'x', headerName: 'X' }], rows: [{ id: 0, x: 'B' }] };
    // Force a collision: both tabs share the SAME id but carry DIFFERENT payloads.
    const collidingId = 'table:COLLIDE';
    openTab({ id: collidingId, kind: PanelTabKind.Table, title: 'A', payload: payloadA });
    openTab({ id: collidingId, kind: PanelTabKind.Table, title: 'B', payload: payloadB });
    const s = usePanelStore.getState();
    // Distinct content must not be silently aliased: two separate tabs survive,
    // and the second tab keeps its own (B) payload rather than showing A's.
    expect(s.tabs).toHaveLength(2);
    const active = s.tabs.find((t) => t.id === s.activeTabId);
    expect(active?.payload.rows[0].x).toBe('B');
    expect(active?.title).toBe('B');
  });
});
