# Workspace Phase 1 — Multi-project external tabs (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the single-project app into a Chrome-style multi-project workspace: open several projects as top-level tabs and switch between them, each rendering the existing project dashboard.

**Architecture:** A new `useWorkspaceStore` is the source of truth for open project tabs (`dashboards`) and the active one. It **bridges** to the existing `useAppStore.selectedProject` singleton — switching the active tab sets `selectedProject`, so every existing project-scoped piece (`ProjectProvider`/`useProject`, dashboard load, sessions, favorites, `BottomPanel`) keeps working unchanged. A `WorkspaceBar` renders the tab strip; a `ProjectPicker` popover backs the `+`.

**Tech Stack:** React 19, TypeScript, zustand, Tailwind 4 + CSS custom properties, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-31-tabbed-workspace-design.md` (this is **Phase 1 of 3**: external project tabs only. Phase 2 = internal conversation/agent tabs; Phase 3 = hamburger slide-over. Each phase is shipped and verified before the next.)

**Conventions:** named exports only; `@/` alias; no `any`; 300-line file cap; CSS vars via inline `style={{}}` (never hardcoded Tailwind colors); explicit ternaries; keys = stable ids; zustand always selector-based; only `_ui/` folders get an `index.ts` barrel.

---

## File Structure

**Create:**
- `src/store/useWorkspaceStore.ts` — open project tabs + active id + open/close/setActive, bridged to `selectedProject`.
- `src/store/useWorkspaceStore.test.ts` — reducer tests.
- `src/components/Workspace/WorkspaceBar/WorkspaceBar.tsx` — the external tab strip.
- `src/components/Workspace/ProjectPicker/ProjectPicker.tsx` — `+` popover listing projects.

**Modify:**
- `src/App.tsx` — render `<WorkspaceBar />`; route project selection through `openDashboard`.

**Phase-1 boundary:** the dashboard body itself is unchanged this phase — each active tab still renders today's `ProjectDashboard` (with its merged Chat/Context/Task/Plan inner tabs). Those get reworked in Phase 2.

---

## Task 1: `useWorkspaceStore`

**Files:**
- Create: `src/store/useWorkspaceStore.ts`
- Test: `src/store/useWorkspaceStore.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/store/useWorkspaceStore.test.ts
import { beforeEach, describe, expect, it } from 'vitest';

import type { Project } from '@/types/dashboard.types';

import { useAppStore } from './useAppStore';
import { useWorkspaceStore } from './useWorkspaceStore';

const proj = (id: string): Project => ({
  id, name: id, path: `/p/${id}`, claudeDir: `/p/${id}/.claude`,
  hasAgents: true, hasSkills: true, hasSettings: true, agentCount: 0, skillCount: 0,
});

const initial = useWorkspaceStore.getState();
beforeEach(() => {
  useWorkspaceStore.setState(initial, true);
  useAppStore.setState({ selectedProject: null });
});

describe('useWorkspaceStore', () => {
  it('openDashboard opens a tab, activates it, and mirrors selectedProject', () => {
    const a = proj('a');
    const id = useWorkspaceStore.getState().openDashboard(a);
    const s = useWorkspaceStore.getState();
    expect(s.dashboards).toHaveLength(1);
    expect(s.activeDashboardId).toBe(id);
    expect(useAppStore.getState().selectedProject?.id).toBe('a');
  });

  it('openDashboard dedupes by project id (re-activates instead of duplicating)', () => {
    const a = proj('a');
    const id1 = useWorkspaceStore.getState().openDashboard(a);
    useWorkspaceStore.getState().openDashboard(proj('b'));
    const id2 = useWorkspaceStore.getState().openDashboard(a);
    expect(id2).toBe(id1);
    expect(useWorkspaceStore.getState().dashboards).toHaveLength(2);
    expect(useWorkspaceStore.getState().activeDashboardId).toBe(id1);
  });

  it('closeDashboard on the active tab activates a neighbour', () => {
    const ws = useWorkspaceStore.getState();
    const idA = ws.openDashboard(proj('a'));
    const idB = ws.openDashboard(proj('b'));
    expect(useWorkspaceStore.getState().activeDashboardId).toBe(idB);
    useWorkspaceStore.getState().closeDashboard(idB);
    expect(useWorkspaceStore.getState().activeDashboardId).toBe(idA);
    expect(useAppStore.getState().selectedProject?.id).toBe('a');
  });

  it('closing the last tab clears active and selectedProject', () => {
    const id = useWorkspaceStore.getState().openDashboard(proj('a'));
    useWorkspaceStore.getState().closeDashboard(id);
    expect(useWorkspaceStore.getState().dashboards).toHaveLength(0);
    expect(useWorkspaceStore.getState().activeDashboardId).toBeNull();
    expect(useAppStore.getState().selectedProject).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/useWorkspaceStore.test.ts`
Expected: FAIL — cannot resolve `./useWorkspaceStore`.

- [ ] **Step 3: Implement the store**

```ts
// src/store/useWorkspaceStore.ts
import { create } from 'zustand';

import type { Project } from '@/types/dashboard.types';

import { useAppStore } from './useAppStore';

export type Dashboard = {
  id: string;
  project: Project;
};

type WorkspaceState = {
  dashboards: Dashboard[];
  activeDashboardId: string | null;
  openDashboard: (project: Project) => string;
  closeDashboard: (id: string) => void;
  setActiveDashboard: (id: string | null) => void;
};

let counter = 0;

function syncSelectedProject(dashboards: Dashboard[], activeId: string | null): void {
  const active = dashboards.find((d) => d.id === activeId) ?? null;
  useAppStore.getState().setSelectedProject(active ? active.project : null);
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  dashboards: [],
  activeDashboardId: null,

  openDashboard: (project) => {
    const existing = get().dashboards.find((d) => d.project.id === project.id);
    if (existing) {
      set({ activeDashboardId: existing.id });
      syncSelectedProject(get().dashboards, existing.id);
      return existing.id;
    }
    const id = `dash-${++counter}`;
    const dashboards = [...get().dashboards, { id, project }];
    set({ dashboards, activeDashboardId: id });
    syncSelectedProject(dashboards, id);
    return id;
  },

  closeDashboard: (id) => {
    const { dashboards, activeDashboardId } = get();
    const idx = dashboards.findIndex((d) => d.id === id);
    if (idx === -1) return;
    const next = dashboards.filter((d) => d.id !== id);
    let nextActive = activeDashboardId;
    if (activeDashboardId === id) {
      const neighbour = next[idx] ?? next[idx - 1] ?? null;
      nextActive = neighbour ? neighbour.id : null;
    }
    set({ dashboards: next, activeDashboardId: nextActive });
    syncSelectedProject(next, nextActive);
  },

  setActiveDashboard: (id) => {
    set({ activeDashboardId: id });
    syncSelectedProject(get().dashboards, id);
  },
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/useWorkspaceStore.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/useWorkspaceStore.ts src/store/useWorkspaceStore.test.ts
git commit -m "feat(workspace): useWorkspaceStore for multi-project tabs"
```

---

## Task 2: `ProjectPicker` popover (the `+` target)

**Files:**
- Create: `src/components/Workspace/ProjectPicker/ProjectPicker.tsx`

A small popover listing available projects. Closes on outside-click. Selecting one calls `onSelect(project)`.

- [ ] **Step 1: Implement `ProjectPicker.tsx`**

```tsx
// src/components/Workspace/ProjectPicker/ProjectPicker.tsx
import { Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useProjects } from '@/hooks/useProjects';
import type { Project } from '@/types/dashboard.types';

export type ProjectPickerProps = {
  onSelect: (project: Project) => void;
  openIds: string[];
};

export function ProjectPicker({ onSelect, openIds }: ProjectPickerProps) {
  const { projects } = useProjects();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Open a project"
        className="flex items-center justify-center w-7 h-7 rounded-md transition-colors"
        style={{ color: 'var(--color-text-muted)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <Plus size={15} />
      </button>

      {open ? (
        <div
          className="absolute top-full left-0 mt-1.5 w-72 rounded-xl z-50 overflow-hidden max-h-80 overflow-y-auto"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', boxShadow: '0 12px 48px rgba(0,0,0,0.5)' }}
        >
          {projects.map((p) => {
            const alreadyOpen = openIds.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => { onSelect(p); setOpen(false); }}
                className="w-full text-left px-4 py-2 transition-colors"
                style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-3)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span className="text-[13px] truncate block">{p.name}</span>
                <span className="text-[10px] truncate block" style={{ color: alreadyOpen ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
                  {alreadyOpen ? 'already open' : p.path}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit -p tsconfig.web.json`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Workspace/ProjectPicker
git commit -m "feat(workspace): ProjectPicker popover for opening project tabs"
```

---

## Task 3: `WorkspaceBar` (the external tab strip)

**Files:**
- Create: `src/components/Workspace/WorkspaceBar/WorkspaceBar.tsx`

Renders one tab per open dashboard (project name + `×`), highlights the active one, and the `+` (ProjectPicker). Returns `null` (renders nothing) when no dashboards are open, so App's empty-state grid shows through.

- [ ] **Step 1: Implement `WorkspaceBar.tsx`**

```tsx
// src/components/Workspace/WorkspaceBar/WorkspaceBar.tsx
import { X } from 'lucide-react';

import { useWorkspaceStore } from '@/store/useWorkspaceStore';

import { ProjectPicker } from '../ProjectPicker/ProjectPicker';

export function WorkspaceBar() {
  const dashboards = useWorkspaceStore((s) => s.dashboards);
  const activeId = useWorkspaceStore((s) => s.activeDashboardId);
  const setActive = useWorkspaceStore((s) => s.setActiveDashboard);
  const closeDashboard = useWorkspaceStore((s) => s.closeDashboard);
  const openDashboard = useWorkspaceStore((s) => s.openDashboard);

  if (dashboards.length === 0) return null;

  return (
    <div
      className="flex items-center gap-1 px-2 py-1 shrink-0 overflow-x-auto"
      style={{ background: 'var(--color-surface-0)', borderBottom: '1px solid var(--color-border)' }}
    >
      {dashboards.map((d) => {
        const isActive = d.id === activeId;
        return (
          <div
            key={d.id}
            onClick={() => setActive(d.id)}
            className="group flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-t-md cursor-pointer transition-colors shrink-0"
            style={{
              background: isActive ? 'var(--color-surface-2)' : 'transparent',
              borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
            }}
          >
            <span
              className="text-xs truncate max-w-[160px]"
              style={{ color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
            >
              {d.project.name}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); closeDashboard(d.id); }}
              title="Close"
              className="flex items-center justify-center w-4 h-4 rounded transition-opacity opacity-50 hover:opacity-100"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <X size={11} />
            </button>
          </div>
        );
      })}
      <ProjectPicker onSelect={openDashboard} openIds={dashboards.map((d) => d.project.id)} />
    </div>
  );
}
```

- [ ] **Step 2: Verify compile + lint**

Run: `npx tsc --noEmit -p tsconfig.web.json && npm run lint`
Expected: 0 errors, 0 warnings.

- [ ] **Step 3: Commit**

```bash
git add src/components/Workspace/WorkspaceBar
git commit -m "feat(workspace): WorkspaceBar external project tab strip"
```

---

## Task 4: Wire `WorkspaceBar` into `App.tsx`

**Files:**
- Modify: `src/App.tsx`

Render the tab strip above the main content, and route every project-selection entry point through `openDashboard` so it opens/activates a tab. The existing `selectedProject`-driven render stays — the store mirrors it.

- [ ] **Step 1: Add imports**

At the top of `src/App.tsx` add:

```tsx
import { WorkspaceBar } from "@/components/Workspace/WorkspaceBar/WorkspaceBar";
import { useWorkspaceStore } from "./store/useWorkspaceStore";
```

- [ ] **Step 2: Read the action in the component**

Near the other store reads (after `const setSelectedProject = useAppStore((s) => s.setSelectedProject);`) add:

```tsx
  const openDashboard = useWorkspaceStore((s) => s.openDashboard);
```

- [ ] **Step 3: Route project selection through `openDashboard`**

Replace the two `setSelectedProject(...)` selection entry points (NOT the store-internal one):
- The header `<ProjectSwitcher … onSelect={setSelectedProject} />` → `onSelect={openDashboard}`.
- The empty-state project grid button `onClick={() => setSelectedProject(p)}` → `onClick={() => openDashboard(p)}`.

(Leave the `useAppStore` declaration and the `selectedProject` reads intact — `openDashboard` updates `selectedProject` via the store bridge.)

- [ ] **Step 4: Render `<WorkspaceBar />` above the main content**

Find the `{/* Main content */}` wrapper (`<div className="flex-1 min-h-0 flex flex-col">`). Insert `<WorkspaceBar />` as its first child, before the `{!selectedProject ? (…) : …}` block:

```tsx
      {/* Main content */}
      <div className="flex-1 min-h-0 flex flex-col">
        <WorkspaceBar />
        {!selectedProject ? (
          // …unchanged empty-state grid…
```

- [ ] **Step 5: Verify compile + lint + build**

Run: `npx tsc --noEmit -p tsconfig.web.json && npm run lint && npx electron-vite build`
Expected: 0 errors, 0 warnings, build exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat(workspace): mount WorkspaceBar and open projects as tabs"
```

---

## Task 5: Full gate + manual verification

- [ ] **Step 1: Run the full automated gate**

```bash
npx tsc --noEmit -p tsconfig.web.json
npm run lint
npx vitest run
npx electron-vite build
```
Expected: typecheck 0; lint 0/0; all tests pass (prior suite + the new `useWorkspaceStore.test.ts` = 4 tests); build exit 0.

- [ ] **Step 2: Manual visual check (`npm run dev`)**

- Selecting a project (header switcher or empty-state grid) opens a **tab** in the WorkspaceBar and shows its dashboard.
- Opening a second project adds a second tab; clicking between tabs switches the whole dashboard + sidebar to that project.
- Re-selecting an already-open project just re-activates its tab (no duplicate).
- `×` closes a tab; closing the active one activates a neighbour; closing the last returns to the project picker.
- The `+` popover lists projects and marks already-open ones.

- [ ] **Step 3: Final commit (only if a verification fix was needed)**

```bash
git add -A
git commit -m "chore(workspace): phase 1 verification fixes"
```

---

## Notes

- **Phase boundary:** this phase does NOT touch the dashboard body, the internal tabs, the sidebar scoping logic, or Context/Task/Plan. Each active tab renders the existing `ProjectDashboard` as-is. Phases 2 and 3 (separate plans) handle internal tabs and the hamburger slide-over.
- **selectedProject bridge:** `useWorkspaceStore` is the only thing that should call `setSelectedProject` for tab switching; everything else keeps reading `selectedProject`. This keeps the existing per-project plumbing (dashboard load, sessions watch, favorites) working with zero changes.
- **Two `Project` types** (`@/types/dashboard.types` and the identical one re-declared in `useAppStore`) are structurally identical, so the bridge typechecks. Use the `@/types/dashboard.types` one in new code.
