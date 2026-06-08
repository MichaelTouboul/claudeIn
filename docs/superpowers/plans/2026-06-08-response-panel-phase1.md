# Response → Right Panel — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-block "Open" action on chat table blocks that opens the table in the right `UtilityPanel` as a read-only tab, with a zustand-backed multi-tab panel.

**Architecture:** A `usePanelStore` (zustand) holds the open tabs + active tab + panel open state, replacing `Dashboard`'s local `panelOpen` useState. `UtilityPanel` reads the store and renders a tab bar (`_ui/Tabs`) plus the active tab's body via a `Record<PanelTabKind, Component>` map (enum + behavior map — no fallback chains). `TableBlock` registers an `open` local action that pushes a `table` tab. Phase 1 is read-only; editing/export/LLM come in later phases.

**Tech Stack:** React 19, zustand (selector-based), MUI X DataGrid (already a dependency, reused from `TableBlock`), `_ui/Tabs`, `_ui/Dialog` (`drawer-right`), vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-06-08-response-panel-design.md`

**No new npm dependencies in Phase 1.**

---

## File structure (Phase 1)

```
src/store/usePanelStore.ts                 ← CREATE: store + PanelTabKind/PanelTab/TablePayload types + tableTabId()
src/store/usePanelStore.test.ts            ← CREATE: store unit tests
.../UtilityPanel/TableTab/TableTab.tsx     ← CREATE: read-only DataGrid for a table tab
.../UtilityPanel/TableTab/TableTab.test.tsx← CREATE
.../UtilityPanel/panelTabBody.tsx          ← CREATE: TAB_BODY map (kind → component)
.../UtilityPanel/UtilityPanel.tsx          ← MODIFY: read store, render tab bar + active body (drop props)
.../UtilityPanel/UtilityPanel.test.tsx     ← CREATE
.../Dashboard/Dashboard.tsx                ← MODIFY: drop local panelOpen, wire store
.../blocks/TableBlock/TableBlock.tsx       ← MODIFY: register an `open` action
.../blocks/TableBlock/TableBlock.test.tsx  ← CREATE: clicking Open pushes a tab
```

Data types (`PanelTabKind`, `PanelTab`, `TablePayload`) live **in the store** so components depend on the store, never the reverse. The `TAB_BODY` map (which imports tab components) lives in the `UtilityPanel` folder. `TablePayload` reuses `TableColumn`/`TableRow` from `parseTable` via type-only import (no runtime coupling, honours "reuse the source type").

---

## Task 1: `usePanelStore`

**Files:**
- Create: `src/store/usePanelStore.ts`
- Test: `src/store/usePanelStore.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/store/usePanelStore.test.ts
import { beforeEach, describe, expect, it } from 'vitest';

import { PanelTabKind, type PanelTab, tableTabId, usePanelStore } from './usePanelStore';

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/usePanelStore.test.ts`
Expected: FAIL — cannot resolve `./usePanelStore`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/store/usePanelStore.ts
import { create } from 'zustand';

import type { TableColumn, TableRow } from '@/components/ResponseBody/blocks/TableBlock/parseTable';

/** Finite set of panel tab kinds. Widened in later phases (code, text, …). */
export const PanelTabKind = { Table: 'table' } as const;
export type PanelTabKind = (typeof PanelTabKind)[keyof typeof PanelTabKind];

export type TablePayload = { columns: TableColumn[]; rows: TableRow[] };

export type PanelTab = {
  /** Stable id used for dedup (see tableTabId). */
  id: string;
  kind: PanelTabKind;
  title: string;
  payload: TablePayload;
};

type PanelState = {
  isOpen: boolean;
  tabs: PanelTab[];
  activeTabId: string | null;
  /** Push a tab (or refocus if its id already exists) and open the panel. */
  openTab: (tab: PanelTab) => void;
  closeTab: (id: string) => void;
  setActive: (id: string) => void;
  setOpen: (open: boolean) => void;
  togglePanel: () => void;
};

export const usePanelStore = create<PanelState>((set) => ({
  isOpen: false,
  tabs: [],
  activeTabId: null,
  openTab: (tab) =>
    set((s) => ({
      isOpen: true,
      activeTabId: tab.id,
      tabs: s.tabs.some((t) => t.id === tab.id) ? s.tabs : [...s.tabs, tab],
    })),
  closeTab: (id) =>
    set((s) => {
      const tabs = s.tabs.filter((t) => t.id !== id);
      const activeTabId =
        s.activeTabId === id ? (tabs.length > 0 ? tabs[tabs.length - 1].id : null) : s.activeTabId;
      return { tabs, activeTabId };
    }),
  setActive: (id) => set({ activeTabId: id }),
  setOpen: (open) => set({ isOpen: open }),
  togglePanel: () => set((s) => ({ isOpen: !s.isOpen })),
}));

/** Stable content hash (djb2) so re-opening the same table refocuses its tab. */
export function tableTabId(payload: TablePayload): string {
  const str = JSON.stringify({ c: payload.columns, r: payload.rows });
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return `table:${h >>> 0}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/usePanelStore.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/usePanelStore.ts src/store/usePanelStore.test.ts
git commit -m "feat(panel): usePanelStore — tabs + active + open state"
```

---

## Task 2: `TableTab` (read-only grid)

**Files:**
- Create: `src/components/Workspace/DashboardArea/Dashboard/UtilityPanel/TableTab/TableTab.tsx`
- Test: `src/components/Workspace/DashboardArea/Dashboard/UtilityPanel/TableTab/TableTab.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// TableTab/TableTab.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PanelTabKind, type PanelTab } from '@/store/usePanelStore';

import { TableTab } from './TableTab';

const tab: PanelTab = {
  id: 'table:1',
  kind: PanelTabKind.Table,
  title: 'Table',
  payload: {
    columns: [{ field: 'name', headerName: 'Name' }],
    rows: [{ id: 0, name: 'Alice' }],
  },
};

describe('TableTab', () => {
  it('renders the column header and a cell value', () => {
    render(<TableTab tab={tab} />);
    expect(screen.getByText('Name')).not.toBeNull();
    expect(screen.getByText('Alice')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Workspace/DashboardArea/Dashboard/UtilityPanel/TableTab/TableTab.test.tsx`
Expected: FAIL — cannot resolve `./TableTab`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// TableTab/TableTab.tsx
import { ThemeProvider } from '@mui/material/styles';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';

import { muiTheme } from '@/components/ResponseBody/blocks/TableBlock/muiTheme';
import type { PanelTab } from '@/store/usePanelStore';

export function TableTab({ tab }: { tab: PanelTab }) {
  const { columns, rows } = tab.payload;
  const gridColumns: GridColDef[] = columns.map((c) => ({
    field: c.field,
    headerName: c.headerName,
    flex: 1,
    minWidth: 120,
  }));

  return (
    <ThemeProvider theme={muiTheme}>
      <div className="h-full p-2">
        <DataGrid
          rows={rows}
          columns={gridColumns}
          density="compact"
          disableRowSelectionOnClick
          sx={{ border: 0, height: '100%', fontFamily: "'JetBrains Mono', monospace" }}
        />
      </div>
    </ThemeProvider>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Workspace/DashboardArea/Dashboard/UtilityPanel/TableTab/TableTab.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Workspace/DashboardArea/Dashboard/UtilityPanel/TableTab/
git commit -m "feat(panel): TableTab — read-only DataGrid from a table payload"
```

---

## Task 3: `TAB_BODY` map

**Files:**
- Create: `src/components/Workspace/DashboardArea/Dashboard/UtilityPanel/panelTabBody.tsx`

No standalone test (a one-line typed map; covered by the UtilityPanel test in Task 4).

- [ ] **Step 1: Write the map**

```tsx
// UtilityPanel/panelTabBody.tsx
import { type ComponentType } from 'react';

import { PanelTabKind, type PanelTab } from '@/store/usePanelStore';

import { TableTab } from './TableTab/TableTab';

/** kind → body component. Add a PanelTabKind value + an entry here to extend the panel. */
export const TAB_BODY: Record<PanelTabKind, ComponentType<{ tab: PanelTab }>> = {
  [PanelTabKind.Table]: TableTab,
};
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: 0 errors (the `Record<PanelTabKind, …>` is total because `Table` is the only kind).

- [ ] **Step 3: Commit**

```bash
git add src/components/Workspace/DashboardArea/Dashboard/UtilityPanel/panelTabBody.tsx
git commit -m "feat(panel): TAB_BODY kind→component map"
```

---

## Task 4: `UtilityPanel` reads the store (tab bar + active body)

**Files:**
- Modify: `src/components/Workspace/DashboardArea/Dashboard/UtilityPanel/UtilityPanel.tsx`
- Test: `src/components/Workspace/DashboardArea/Dashboard/UtilityPanel/UtilityPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// UtilityPanel/UtilityPanel.test.tsx
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { PanelTabKind, usePanelStore } from '@/store/usePanelStore';

import { UtilityPanel } from './UtilityPanel';

beforeEach(() => {
  usePanelStore.setState({ isOpen: false, tabs: [], activeTabId: null });
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Workspace/DashboardArea/Dashboard/UtilityPanel/UtilityPanel.test.tsx`
Expected: FAIL — current `UtilityPanel` requires `open`/`onClose` props and renders no tab content.

- [ ] **Step 3: Rewrite `UtilityPanel.tsx`**

```tsx
// UtilityPanel/UtilityPanel.tsx
import { X } from 'lucide-react';

import { Dialog } from '@/components/_ui/Dialog';
import { type TabItem, Tabs } from '@/components/_ui/Tabs';
import { usePanelStore } from '@/store/usePanelStore';

import { TAB_BODY } from './panelTabBody';

export function UtilityPanel() {
  const isOpen = usePanelStore((s) => s.isOpen);
  const tabs = usePanelStore((s) => s.tabs);
  const activeTabId = usePanelStore((s) => s.activeTabId);
  const setActive = usePanelStore((s) => s.setActive);
  const closeTab = usePanelStore((s) => s.closeTab);
  const setOpen = usePanelStore((s) => s.setOpen);

  const active = tabs.find((t) => t.id === activeTabId) ?? null;
  const Body = active ? TAB_BODY[active.kind] : null;
  const tabItems: TabItem[] = tabs.map((t) => ({ key: t.id, label: t.title, onClose: () => closeTab(t.id) }));

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) setOpen(false); }} variant="drawer-right" title="Panel">
      <div
        className="relative h-full flex flex-col w-[480px] max-w-[90%]"
        style={{
          background: 'var(--color-surface-1)',
          borderLeft: '1px solid var(--color-border)',
          boxShadow: '-12px 0 48px rgba(0,0,0,0.4)',
        }}
      >
        <div className="flex items-center justify-between pr-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <Tabs tabs={tabItems} active={activeTabId ?? ''} onChange={setActive} className="flex-1" />
          <button
            onClick={() => setOpen(false)}
            title="Close"
            aria-label="Close panel"
            className="flex items-center justify-center w-7 h-7 rounded-md shrink-0"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={15} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {active && Body ? (
            <Body tab={active} />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                Open a table from a response to start.
              </p>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Workspace/DashboardArea/Dashboard/UtilityPanel/UtilityPanel.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/Workspace/DashboardArea/Dashboard/UtilityPanel/UtilityPanel.tsx src/components/Workspace/DashboardArea/Dashboard/UtilityPanel/UtilityPanel.test.tsx
git commit -m "feat(panel): UtilityPanel renders store-backed tabs + active body"
```

---

## Task 5: Wire `Dashboard` to the store

**Files:**
- Modify: `src/components/Workspace/DashboardArea/Dashboard/Dashboard.tsx`

The `UtilityPanel` is now propless and the ☰ button toggles the store. (Covered by Task 4's tests + the existing `InternalTabBar` test; no new test — this is wiring.)

- [ ] **Step 1: Edit `Dashboard.tsx`**

Replace the file body with:

```tsx
// Dashboard.tsx
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { usePanelStore } from '@/store/usePanelStore';

import { DashboardSurface } from './DashboardSurface/DashboardSurface';
import { InternalTabBar } from './InternalTabBar/InternalTabBar';
import { LauncherView } from './LauncherView/LauncherView';
import { UtilityPanel } from './UtilityPanel/UtilityPanel';

export function Dashboard() {
  const togglePanel = usePanelStore((s) => s.togglePanel);
  const dashboards = useWorkspaceStore((s) => s.dashboards);
  const activeDashboardId = useWorkspaceStore((s) => s.activeDashboardId);

  const active = dashboards.find((d) => d.id === activeDashboardId) ?? null;
  const isLauncher = active?.scope.kind === 'launcher';

  return (
    <div className="flex-1 flex flex-col h-full relative">
      {isLauncher ? null : <InternalTabBar onOpenPanel={togglePanel} />}

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {isLauncher && active ? <LauncherView dashboardId={active.id} /> : null}
        <DashboardSurface />
      </div>

      <UtilityPanel />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + existing tests**

Run: `npm run typecheck && npx vitest run src/components/Workspace/DashboardArea/Dashboard/InternalTabBar/InternalTabBar.test.tsx`
Expected: 0 type errors; InternalTabBar tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/Workspace/DashboardArea/Dashboard/Dashboard.tsx
git commit -m "feat(panel): Dashboard sources panel state from usePanelStore"
```

---

## Task 6: `TableBlock` registers an `Open` action

**Files:**
- Modify: `src/components/ResponseBody/blocks/TableBlock/TableBlock.tsx`
- Test: `src/components/ResponseBody/blocks/TableBlock/TableBlock.test.tsx`

- [ ] **Step 1: Write the failing test**

`TableBlock` parses a hast `node`. The test builds a minimal hast table node, renders the block, clicks **Open**, and asserts a tab was pushed.

```tsx
// TableBlock/TableBlock.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { usePanelStore } from '@/store/usePanelStore';

import { TableBlock } from './TableBlock';

/** Minimal hast table: one header "Name", one row "Alice". */
const node = {
  type: 'element',
  tagName: 'table',
  children: [
    { type: 'element', tagName: 'thead', children: [
      { type: 'element', tagName: 'tr', children: [
        { type: 'element', tagName: 'th', children: [{ type: 'text', value: 'Name' }] },
      ] },
    ] },
    { type: 'element', tagName: 'tbody', children: [
      { type: 'element', tagName: 'tr', children: [
        { type: 'element', tagName: 'td', children: [{ type: 'text', value: 'Alice' }] },
      ] },
    ] },
  ],
};

beforeEach(() => {
  usePanelStore.setState({ isOpen: false, tabs: [], activeTabId: null });
});

describe('TableBlock Open action', () => {
  it('clicking Open pushes a table tab and opens the panel', () => {
    render(<TableBlock node={node} raw="" />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    const s = usePanelStore.getState();
    expect(s.isOpen).toBe(true);
    expect(s.tabs).toHaveLength(1);
    expect(s.tabs[0].kind).toBe('table');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ResponseBody/blocks/TableBlock/TableBlock.test.tsx`
Expected: FAIL — no button named "Open" (only "Copy" is registered).

- [ ] **Step 3: Add the `open` action to `TableBlock.tsx`**

Add the import and, inside the component, build the `open` action and register it before `copy`:

```tsx
// add to imports
import { PanelTabKind, tableTabId, usePanelStore } from '@/store/usePanelStore';

// inside TableBlock(), after `const { columns, rows } = parseTableNode(...)`:
const openTab = usePanelStore((s) => s.openTab);

const open: BlockAction = {
  id: 'open',
  label: 'Open',
  kind: 'local',
  run: () =>
    openTab({
      id: tableTabId({ columns, rows }),
      kind: PanelTabKind.Table,
      title: 'Table',
      payload: { columns, rows },
    }),
};
```

Then change the registration line from `register([copy]);` to:

```tsx
register([open, copy]);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ResponseBody/blocks/TableBlock/TableBlock.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ResponseBody/blocks/TableBlock/TableBlock.tsx src/components/ResponseBody/blocks/TableBlock/TableBlock.test.tsx
git commit -m "feat(panel): TableBlock Open action pushes a table tab"
```

---

## Task 7: Full gate

- [ ] **Step 1: Run the gate**

Run: `bash .claude/hooks/gate.sh`
Expected: `✓ all gates green` (lint 0/0, typecheck web + electron, build, all vitest tests pass).

- [ ] **Step 2: Manual smoke (optional)**

Run `npm run dev`, open a conversation whose response contains a markdown table, hover the table block, click **Open** → the right panel opens with the table as a tab; the ☰ button toggles the panel; the tab's × closes it.

- [ ] **Step 3: Final commit (if the gate auto-fixed anything)**

```bash
git add -A && git commit -m "chore(panel): phase 1 gate green" || echo "nothing to commit"
```

---

## Self-review notes

- **Spec coverage (Phase 1 rows):** per-block button on tables ✓ (Task 6), stacked tabs in `UtilityPanel` ✓ (Tasks 3–4), dedup by content id ✓ (`tableTabId`, Tasks 1+6), read-only table tab ✓ (Task 2), panel state in zustand replacing local `panelOpen` ✓ (Tasks 1+5). Editing/export/LLM and code/text tabs are explicitly **later phases** — not in this plan.
- **Type consistency:** `openTab`, `closeTab`, `setActive`, `setOpen`, `togglePanel`, `PanelTabKind`, `PanelTab`, `TablePayload`, `tableTabId` are used identically across Tasks 1, 4, 6. `TableColumn`/`TableRow` reused from `parseTable`.
- **No new deps:** MUI DataGrid, `_ui/Tabs`, `_ui/Dialog` all already exist.
