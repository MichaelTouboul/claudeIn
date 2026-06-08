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
});
