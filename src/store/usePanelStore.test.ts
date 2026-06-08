import { beforeEach, describe, expect, it } from 'vitest';

import {
  codeTabId,
  type PanelTab,
  PanelTabKind,
  type TablePayload,
  tableTabId,
  textTabId,
  usePanelStore,
} from './usePanelStore';

function tableTab(id: string, title = 'Table'): PanelTab {
  return { id, kind: PanelTabKind.Table, title, payload: { columns: [], rows: [] } };
}

/** Narrow a looked-up tab to its table payload for assertions (throws otherwise). */
function tablePayloadOf(id: string): TablePayload {
  const tab = usePanelStore.getState().tabs.find((t) => t.id === id);
  if (!tab || tab.kind !== PanelTabKind.Table) throw new Error(`no table tab ${id}`);
  return tab.payload;
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

  it('updateTab patches the targeted tab payload in place, leaving others untouched', () => {
    const { openTab, updateTab } = usePanelStore.getState();
    openTab(tableTab('a'));
    openTab(tableTab('b'));
    const patched = {
      columns: [{ field: 'name', headerName: 'Name' }],
      rows: [{ id: 0, name: 'Edited' }],
    };
    updateTab('a', { kind: PanelTabKind.Table, payload: patched });
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

  it('updateTab rejects a payload whose kind differs from the target tab', () => {
    const { openTab, updateTab } = usePanelStore.getState();
    openTab(tableTab('a'));
    // A rogue/unsafe caller (e.g. via a stale cast) tries to slot a TextPayload
    // into a Table tab. The runtime guard must drop the payload, leaving the tab
    // structurally intact: kind 'table' keeps its TablePayload.
    updateTab('a', { kind: PanelTabKind.Text, payload: { text: 'rogue' } });
    const a = usePanelStore.getState().tabs.find((t) => t.id === 'a');
    expect(a?.kind).toBe(PanelTabKind.Table);
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
    expect(tablePayloadOf('a').rows).toEqual([
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

  it('opens a code tab and keeps its payload, deduping identical source', () => {
    const { openTab } = usePanelStore.getState();
    const id = codeTabId({ lang: 'ts', src: 'const x = 1;' });
    openTab({
      id,
      kind: PanelTabKind.Code,
      title: 'Code',
      payload: { lang: 'ts', src: 'const x = 1;' },
    });
    openTab({
      id,
      kind: PanelTabKind.Code,
      title: 'Code',
      payload: { lang: 'ts', src: 'const x = 1;' },
    });
    const s = usePanelStore.getState();
    expect(s.tabs).toHaveLength(1);
    const tab = s.tabs[0];
    expect(tab.kind).toBe(PanelTabKind.Code);
    expect(tab.payload).toEqual({ lang: 'ts', src: 'const x = 1;' });
  });

  it('opens a text tab and keeps its payload, deduping identical text', () => {
    const { openTab } = usePanelStore.getState();
    const id = textTabId({ text: '# Title' });
    openTab({ id, kind: PanelTabKind.Text, title: 'Text', payload: { text: '# Title' } });
    openTab({ id, kind: PanelTabKind.Text, title: 'Text', payload: { text: '# Title' } });
    const s = usePanelStore.getState();
    expect(s.tabs).toHaveLength(1);
    expect(s.tabs[0].payload).toEqual({ text: '# Title' });
  });

  it('codeTabId / textTabId are stable for identical content and differ otherwise', () => {
    expect(codeTabId({ lang: 'ts', src: 'a' })).toBe(codeTabId({ lang: 'ts', src: 'a' }));
    expect(codeTabId({ lang: 'ts', src: 'a' })).not.toBe(codeTabId({ lang: 'ts', src: 'b' }));
    expect(textTabId({ text: 'a' })).toBe(textTabId({ text: 'a' }));
    expect(textTabId({ text: 'a' })).not.toBe(textTabId({ text: 'b' }));
  });

  it('mints a fresh id when a code tab id collides with different content', () => {
    const { openTab } = usePanelStore.getState();
    const id = 'code:COLLIDE';
    openTab({ id, kind: PanelTabKind.Code, title: 'A', payload: { lang: 'ts', src: 'A' } });
    openTab({ id, kind: PanelTabKind.Code, title: 'B', payload: { lang: 'ts', src: 'B' } });
    const s = usePanelStore.getState();
    expect(s.tabs).toHaveLength(2);
    const active = s.tabs.find((t) => t.id === s.activeTabId);
    expect(active?.payload).toEqual({ lang: 'ts', src: 'B' });
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
    expect(active?.kind).toBe(PanelTabKind.Table);
    if (active?.kind !== PanelTabKind.Table) throw new Error('active tab is not a table');
    expect(active.payload.rows[0].x).toBe('B');
    expect(active.title).toBe('B');
  });
});
