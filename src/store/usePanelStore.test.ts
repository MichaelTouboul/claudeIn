import { beforeEach, describe, expect, it } from 'vitest';

import {
  agentTabId,
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

/** Narrow `current` to its table payload for assertions (throws otherwise). */
function currentTablePayload(): TablePayload {
  const cur = usePanelStore.getState().current;
  if (!cur || cur.kind !== PanelTabKind.Table) throw new Error('current is not a table');
  return cur.payload;
}

beforeEach(() => {
  usePanelStore.setState({ isOpen: false, current: null, width: 480 });
});

describe('usePanelStore', () => {
  it('open sets current and opens the panel', () => {
    usePanelStore.getState().open(tableTab('a'));
    const s = usePanelStore.getState();
    expect(s.current?.id).toBe('a');
    expect(s.isOpen).toBe(true);
  });

  it('open REPLACES the current object (single-object, no tabs)', () => {
    const { open } = usePanelStore.getState();
    open(tableTab('a', 'First'));
    open(tableTab('b', 'Second'));
    const s = usePanelStore.getState();
    expect(s.current?.id).toBe('b');
    expect(s.current?.title).toBe('Second');
    expect(s.isOpen).toBe(true);
  });

  it('close hides the panel but keeps the current object', () => {
    const { open, close } = usePanelStore.getState();
    open(tableTab('a'));
    close();
    const s = usePanelStore.getState();
    expect(s.isOpen).toBe(false);
    expect(s.current?.id).toBe('a');
  });

  it('reopening the same object replaces (no dedup/tab list)', () => {
    const { open } = usePanelStore.getState();
    const payload = { columns: [{ field: 'x', headerName: 'X' }], rows: [{ id: 0, x: '1' }] };
    const id = tableTabId(payload);
    open({ id, kind: PanelTabKind.Table, title: 'Table', payload });
    open({ id, kind: PanelTabKind.Table, title: 'Table', payload });
    expect(usePanelStore.getState().current?.id).toBe(id);
  });

  it('setOpen / togglePanel mutate the open flag', () => {
    const { open, setOpen, togglePanel } = usePanelStore.getState();
    open(tableTab('a'));
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

  it('update patches the current object payload in place', () => {
    const { open, update } = usePanelStore.getState();
    open(tableTab('a'));
    const patched = {
      columns: [{ field: 'name', headerName: 'Name' }],
      rows: [{ id: 0, name: 'Edited' }],
    };
    update({ kind: PanelTabKind.Table, payload: patched });
    const cur = usePanelStore.getState().current;
    expect(cur?.payload).toEqual(patched);
    expect(cur?.title).toBe('Table');
    expect(cur?.kind).toBe(PanelTabKind.Table);
  });

  it('update can patch the title without touching the payload', () => {
    const { open, update } = usePanelStore.getState();
    open(tableTab('a'));
    update({ title: 'Renamed' });
    const cur = usePanelStore.getState().current;
    expect(cur?.title).toBe('Renamed');
    expect(cur?.payload).toEqual({ columns: [], rows: [] });
  });

  it('update rejects a payload whose kind differs from the current object', () => {
    const { open, update } = usePanelStore.getState();
    open(tableTab('a'));
    update({ kind: PanelTabKind.Text, payload: { text: 'rogue' } });
    const cur = usePanelStore.getState().current;
    expect(cur?.kind).toBe(PanelTabKind.Table);
    expect(cur?.payload).toEqual({ columns: [], rows: [] });
  });

  it('update is a no-op when the panel is empty', () => {
    usePanelStore.getState().update({ title: 'X' });
    expect(usePanelStore.getState().current).toBeNull();
  });

  it('commitRow replaces a single row by id, reading live state each call', () => {
    const { open, commitRow } = usePanelStore.getState();
    open({
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
    commitRow({ id: 0, name: 'Alice2' });
    commitRow({ id: 1, name: 'Bob2' });
    expect(currentTablePayload().rows).toEqual([
      { id: 0, name: 'Alice2' },
      { id: 1, name: 'Bob2' },
    ]);
  });

  it('commitRow is a no-op when the current object is not a table', () => {
    const { open, commitRow } = usePanelStore.getState();
    open({ id: 'c', kind: PanelTabKind.Code, title: 'Code', payload: { lang: 'ts', src: 'x' } });
    commitRow({ id: 0, name: 'X' });
    expect(usePanelStore.getState().current?.kind).toBe(PanelTabKind.Code);
  });

  it('opens a code object and keeps its payload', () => {
    const { open } = usePanelStore.getState();
    const id = codeTabId({ lang: 'ts', src: 'const x = 1;' });
    open({ id, kind: PanelTabKind.Code, title: 'Code', payload: { lang: 'ts', src: 'const x = 1;' } });
    const cur = usePanelStore.getState().current;
    expect(cur?.kind).toBe(PanelTabKind.Code);
    expect(cur?.payload).toEqual({ lang: 'ts', src: 'const x = 1;' });
  });

  it('opens a text object and keeps its payload', () => {
    const { open } = usePanelStore.getState();
    const id = textTabId({ text: '# Title' });
    open({ id, kind: PanelTabKind.Text, title: 'Text', payload: { text: '# Title' } });
    expect(usePanelStore.getState().current?.payload).toEqual({ text: '# Title' });
  });

  it('codeTabId / textTabId are stable for identical content and differ otherwise', () => {
    expect(codeTabId({ lang: 'ts', src: 'a' })).toBe(codeTabId({ lang: 'ts', src: 'a' }));
    expect(codeTabId({ lang: 'ts', src: 'a' })).not.toBe(codeTabId({ lang: 'ts', src: 'b' }));
    expect(textTabId({ text: 'a' })).toBe(textTabId({ text: 'a' }));
    expect(textTabId({ text: 'a' })).not.toBe(textTabId({ text: 'b' }));
  });

  it('opens an agent object and keeps its payload', () => {
    const { open } = usePanelStore.getState();
    open({
      id: 'agent:research:sess-1',
      kind: PanelTabKind.Agent,
      title: 'research',
      payload: { agentName: 'research', claudeSessionId: 'sess-1' },
    });
    const cur = usePanelStore.getState().current;
    expect(cur?.kind).toBe(PanelTabKind.Agent);
    if (cur?.kind !== PanelTabKind.Agent) throw new Error('not an agent object');
    expect(cur.payload).toEqual({ agentName: 'research', claudeSessionId: 'sess-1' });
    expect(usePanelStore.getState().isOpen).toBe(true);
  });

  it('agentTabId is stable for the same agent+session and differs otherwise', () => {
    expect(agentTabId('research', 'sess-1')).toBe(agentTabId('research', 'sess-1'));
    expect(agentTabId('research', 'sess-1')).not.toBe(agentTabId('writer', 'sess-1'));
    expect(agentTabId('research', 'sess-1')).not.toBe(agentTabId('research', 'sess-2'));
    expect(agentTabId('research', null)).toBe(agentTabId('research', null));
  });

  it('opens a Workflow object carrying the session id and narrows by kind', () => {
    const { open } = usePanelStore.getState();
    open({
      id: 'workflow:sess-1',
      kind: PanelTabKind.Workflow,
      title: 'Session overview',
      payload: { claudeSessionId: 'sess-1' },
    });
    const cur = usePanelStore.getState().current;
    expect(cur?.kind).toBe(PanelTabKind.Workflow);
    if (cur?.kind !== PanelTabKind.Workflow) throw new Error('not a workflow object');
    expect(cur.payload.claudeSessionId).toBe('sess-1');
    expect(usePanelStore.getState().isOpen).toBe(true);
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
});
