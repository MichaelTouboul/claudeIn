import { beforeEach, describe, expect, it } from 'vitest';

import { type PanelTab, PanelTabKind, tableTabId, usePanelStore } from './usePanelStore';

function tableTab(id: string, title = 'Table'): PanelTab {
  return { id, kind: PanelTabKind.Table, title, payload: { columns: [], rows: [] } };
}

beforeEach(() => {
  usePanelStore.setState({ isOpen: false, tabs: [], activeTabId: null, width: 480 });
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

  it('updateTab patches the targeted tab payload in place, leaving others untouched', () => {
    const { openTab, updateTab } = usePanelStore.getState();
    openTab(tableTab('a'));
    openTab(tableTab('b'));
    const patched = {
      columns: [{ field: 'name', headerName: 'Name' }],
      rows: [{ id: 0, name: 'Edited' }],
    };
    updateTab('a', { payload: patched });
    const s = usePanelStore.getState();
    const a = s.tabs.find((t) => t.id === 'a');
    const b = s.tabs.find((t) => t.id === 'b');
    expect(a?.payload).toEqual(patched);
    expect(b?.payload).toEqual({ columns: [], rows: [] });
    // identity / other fields preserved
    expect(a?.title).toBe('Table');
    expect(a?.kind).toBe(PanelTabKind.Table);
  });

  it('updateTab can patch the title without touching the payload', () => {
    const { openTab, updateTab } = usePanelStore.getState();
    openTab(tableTab('a'));
    updateTab('a', { title: 'Renamed' });
    const a = usePanelStore.getState().tabs.find((t) => t.id === 'a');
    expect(a?.title).toBe('Renamed');
    expect(a?.payload).toEqual({ columns: [], rows: [] });
  });

  it('updateTab is a no-op when the id does not exist', () => {
    const { openTab, updateTab } = usePanelStore.getState();
    openTab(tableTab('a'));
    updateTab('missing', { title: 'X' });
    const s = usePanelStore.getState();
    expect(s.tabs).toHaveLength(1);
    expect(s.tabs[0].title).toBe('Table');
  });

  it('commitRow replaces a single row by id, reading live state each call', () => {
    const { openTab, commitRow } = usePanelStore.getState();
    openTab({
      id: 'a',
      kind: PanelTabKind.Table,
      title: 'Table',
      payload: {
        columns: [{ field: 'name', headerName: 'Name' }],
        rows: [
          { id: 0, name: 'Alice' },
          { id: 1, name: 'Bob' },
        ],
      },
    });
    // Sequential commits without a re-render in between must both stick.
    commitRow('a', { id: 0, name: 'Alice2' });
    commitRow('a', { id: 1, name: 'Bob2' });
    const a = usePanelStore.getState().tabs.find((t) => t.id === 'a');
    expect(a?.payload.rows).toEqual([
      { id: 0, name: 'Alice2' },
      { id: 1, name: 'Bob2' },
    ]);
  });

  it('commitRow is a no-op when the tab id is absent', () => {
    const { openTab, commitRow } = usePanelStore.getState();
    openTab(tableTab('a'));
    commitRow('missing', { id: 0, name: 'X' });
    expect(usePanelStore.getState().tabs[0].payload).toEqual({ columns: [], rows: [] });
  });

  it('width defaults to 480', () => {
    expect(usePanelStore.getState().width).toBe(480);
  });

  it('setWidth applies a value within the allowed range as-is', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1600, configurable: true });
    usePanelStore.getState().setWidth(600);
    expect(usePanelStore.getState().width).toBe(600);
  });

  it('setWidth clamps below 320 up to the 320 floor', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1600, configurable: true });
    usePanelStore.getState().setWidth(100);
    expect(usePanelStore.getState().width).toBe(320);
  });

  it('setWidth clamps to 90% of window.innerWidth as the ceiling', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true });
    usePanelStore.getState().setWidth(5000);
    expect(usePanelStore.getState().width).toBe(900);
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
