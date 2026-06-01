# App shell restructure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the renderer into an explicit shell — `App › Header / Workspace{Sidebar | DashboardArea{WorkspaceBar, Dashboard, Console}} / Footer` — with a fixed full-height, no-page-scroll layout.

**Architecture:** Extract `Header` and a new `Footer` from `App.tsx`; the existing `components/Workspace/` folder becomes the middle-wrapper feature folder and absorbs `Sidebar/` (split out of `ProjectDashboard`) and `DashboardArea/` (which holds the project tabs, the `Dashboard` pane = today's `ProjectView`, and the `Console` = today's `BottomPanel`). `ProjectDashboard` is dissolved. Moves use `git mv` (history preserved) + repo-wide import-path fixes, gate-green at every task.

**Tech Stack:** React 19, TypeScript, zustand, Tailwind 4 + CSS custom properties, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-01-app-shell-restructure-design.md`

**Conventions:** named exports only (except `App.tsx`/`main.tsx`); `@/` alias; no `any`; **300-line cap per file**; CSS vars via inline `style={{}}`; explicit ternaries; keys = stable ids; zustand selector-based; only `_ui/` gets a barrel. After any `git mv`, run `npm run lint:fix` for import ordering.

**Move procedure (used in several tasks):** after a `git mv <old> <new>`, find every reference to the old path and update it:
```bash
grep -rln "components/<OLD_PATH>" src | xargs sed -i '' "s#components/<OLD_PATH>#components/<NEW_PATH>#g"   # macOS sed
```
Then `npx tsc --noEmit -p tsconfig.web.json` until 0 errors. When a file is also **renamed** (e.g. `ProjectView`→`Dashboard`), update the **symbol** too (export name + all importers), not just the path.

**Gate (run at the end of every task):**
```bash
npx tsc --noEmit -p tsconfig.web.json   # 0 errors
npm run lint                            # 0 / 0
npx vitest run                          # all pass
npx electron-vite build                 # exit 0
```
`npm install --legacy-peer-deps` first if `node_modules` is missing.

---

## Task 1: Extract `Header`

**Files:** Create `src/components/Header/Header.tsx`; Modify `src/App.tsx`.

- [ ] **Step 1: Create `Header.tsx`** (presentational — the current top bar, lines ~84–111 of `App.tsx`)

```tsx
// src/components/Header/Header.tsx
import { Bot, MessageSquare } from 'lucide-react';

import { Button } from '@/components/_ui/Button';
import { ProjectSwitcher } from '@/components/ProjectSwitcher/ProjectSwitcher';
import { StatsBar } from '@/components/StatsBar/StatsBar';
import type { Project } from '@/types/dashboard.types';

export type HeaderProps = {
  projects: Project[];
  selectedProject: Project | null;
  onSelectProject: (p: Project) => void;
  stats: Parameters<typeof StatsBar>[0]['stats'];
  activeCount: number;
  connected: boolean;
  onOpenChat: () => void;
};

export function Header({ projects, selectedProject, onSelectProject, stats, activeCount, connected, onOpenChat }: HeaderProps) {
  return (
    <div className="titlebar-drag flex items-center gap-4 pl-20 pr-4 py-2 shrink-0" style={{ background: 'var(--color-surface-1)', borderBottom: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-2.5">
        <Bot size={16} className="text-accent" />
        <span className="text-[13px] font-semibold tracking-[0.02em]" style={{ fontFamily: 'var(--font-mono)' }}>Agent Manager</span>
      </div>
      <ProjectSwitcher projects={projects} selected={selectedProject} onSelect={onSelectProject} />
      <div className="flex-1" />
      <StatsBar stats={stats} activeCount={activeCount} connected={connected} />
      <Button intent="outline" size="sm" onClick={onOpenChat} className="glow-cyan text-accent" style={{ fontFamily: 'var(--font-mono)', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
        <MessageSquare size={12} />
        Chat
      </Button>
    </div>
  );
}
```

If `StatsBar`'s props type isn't easily referenced via `Parameters<…>`, import `StatsBarProps`/the `stats` type from `StatsBar` directly and use it. Match the real type.

- [ ] **Step 2: Use it in `App.tsx`** — replace the inline top-bar `<div className="titlebar-drag …">…</div>` (lines ~84–111) with:

```tsx
      <Header
        projects={projects}
        selectedProject={selectedProject}
        onSelectProject={openDashboard}
        stats={stats}
        activeCount={activeCount}
        connected={connected}
        onOpenChat={() => setChatOpen(true)}
      />
```
Add `import { Header } from '@/components/Header/Header';`. Remove now-unused imports from `App.tsx` (`Bot`/`MessageSquare` if no longer used there — note the empty-state grid still uses `Bot`; keep what's still referenced; `Button`, `ProjectSwitcher`, `StatsBar`, `MessageSquare` likely become unused — let lint tell you).

- [ ] **Step 3: Gate, then commit**

```bash
git add src/components/Header src/App.tsx
git commit -m "refactor(shell): extract Header from App"
```

---

## Task 2: Add `Footer` + fixed no-scroll shell

**Files:** Create `src/components/Footer/Footer.tsx`; Modify `src/App.tsx`.

- [ ] **Step 1: Create `Footer.tsx`** (thin empty band)

```tsx
// src/components/Footer/Footer.tsx
export function Footer() {
  return (
    <div
      className="shrink-0 flex items-center px-3"
      style={{ height: '22px', background: 'var(--color-surface-1)', borderTop: '1px solid var(--color-border)' }}
    />
  );
}
```

- [ ] **Step 2: Wire the shell in `App.tsx`** — the outer wrapper stays `className="h-full flex flex-col surface-grain"`. Ensure the order is `<Header/>` · main-content (`flex-1 min-h-0`) · `<Footer/>`. Add `import { Footer } from '@/components/Footer/Footer';` and render `<Footer />` as the last child of the outer wrapper (after the main-content div, before `{chatOpen ? …}`). Confirm the main-content div is `flex-1 min-h-0` so nothing forces page scroll.

- [ ] **Step 3: Gate, then commit**

```bash
git add src/components/Footer src/App.tsx
git commit -m "refactor(shell): add Footer and fixed no-scroll layout"
```

---

## Task 3: Extract `Sidebar` (move sidebar leaves)

**Files:** Create `src/components/Workspace/Sidebar/Sidebar.tsx`; `git mv` sidebar leaf folders; Modify `ProjectDashboard.tsx` (temporarily renders `<Sidebar/>`).

- [ ] **Step 1: Move the sidebar leaf folders under `Workspace/Sidebar/`**

```bash
cd src/components
git mv ProjectDashboard/ConversationList Workspace/Sidebar/ConversationList
git mv ProjectDashboard/PanelsArea        Workspace/Sidebar/PanelsArea
git mv ProjectDashboard/ResizeHandle      Workspace/Sidebar/ResizeHandle
git mv ProjectDashboard/AgentList         Workspace/Sidebar/AgentList
git mv ProjectDashboard/AgentRow          Workspace/Sidebar/AgentRow
git mv ProjectDashboard/SkillRow          Workspace/Sidebar/SkillRow
git mv ProjectDashboard/HookRow           Workspace/Sidebar/HookRow
git mv ProjectDashboard/SectionLabel      Workspace/Sidebar/SectionLabel
git mv ProjectDashboard/OrchestratorTree  Workspace/Sidebar/OrchestratorTree
```
Then fix all imports repo-wide (move procedure) for each moved path, e.g. `components/ProjectDashboard/PanelsArea` → `components/Workspace/Sidebar/PanelsArea`, etc. Run `tsc` until 0.

- [ ] **Step 2: Create `Sidebar.tsx`** — lift the sidebar half of `ProjectDashboard.tsx` (the `ZoneHeader "Activity"` + `<ConversationList/>` + `ZoneHeader "Library"` + `<PanelsArea/>` + `<ResizeHandle/>` block, plus the `ZoneHeader` helper, the `useResizableSidebar`, `useInitFavorites`, `useSessions`, `handleAgentAction`, `handleSelectSession`, and the sidebar container `<div>` with its width/border styling). It reads `projectId`/`projectPath` via `useProject()`. Import the moved children from their new `./ConversationList`, `./PanelsArea`, `./ResizeHandle` paths. Keep it ≤300 lines (if over, split `handleAgentAction` into a sibling `useSidebarActions.ts` hook).

- [ ] **Step 3: `ProjectDashboard.tsx` renders `<Sidebar/>`** — temporarily, replace its inline sidebar block with `<Sidebar />` (keep `<MainContent>`/`<ProjectView>` side as-is for now). Remove the moved helpers/imports now living in `Sidebar`. This keeps the app working mid-refactor.

- [ ] **Step 4: Gate, then commit**

```bash
git add -A
git commit -m "refactor(shell): extract Sidebar, move sidebar leaves under Workspace/Sidebar"
```

---

## Task 4: Build `DashboardArea` (`Dashboard` + `Console`)

**Files:** `git mv` `ProjectView`→`DashboardArea/Dashboard` (+ rename symbol), its siblings, and `BottomPanel`→`DashboardArea/Console`; Create `DashboardArea.tsx`.

- [ ] **Step 1: Move the dashboard-pane folders**

```bash
cd src/components
git mv ProjectDashboard/ProjectView    Workspace/DashboardArea/Dashboard
git mv ProjectDashboard/InternalTabBar Workspace/DashboardArea/Dashboard/InternalTabBar
git mv ProjectDashboard/UtilityPanel   Workspace/DashboardArea/Dashboard/UtilityPanel
git mv ProjectDashboard/SkillDetail    Workspace/DashboardArea/Dashboard/SkillDetail
git mv Workspace/DashboardArea/Dashboard/ProjectView.tsx Workspace/DashboardArea/Dashboard/Dashboard.tsx
```
Rename the symbol `ProjectView` → `Dashboard` inside `Dashboard.tsx` (the `export function ProjectView()` → `export function Dashboard()`), and update its importers (the old `ProjectView` import in `MainContent`/`ProjectDashboard`). Fix all moved-path imports (move procedure). **Relative-import fix:** `Dashboard.tsx` previously imported its siblings via `../InternalTabBar/…`, `../UtilityPanel/…`, `../SkillDetail/…` (when they were siblings of `ProjectView` under `ProjectDashboard/`). Now that they sit **inside** `Dashboard/`, those become `./InternalTabBar/…`, `./UtilityPanel/…`, `./SkillDetail/…`. Its `./ChatTab/…` import is unchanged (ChatTab moved with it). Run `tsc` until 0 — it will flag any missed path.

- [ ] **Step 2: Move `BottomPanel` → `Console`**

```bash
cd src/components
git mv BottomPanel Workspace/DashboardArea/Console
git mv Workspace/DashboardArea/Console/BottomPanel.tsx Workspace/DashboardArea/Console/Console.tsx
```
Rename the symbol `BottomPanel` → `Console` in `Console.tsx` and update its importer (`App.tsx`). Decouple its data: have `Console` read `events`/`agents`/`projectPath` from the stores itself (`useEventsStore`, `useDashboardStore`, `useAppStore`) and drop the three props — so it no longer needs threading through `DashboardArea`. Compute `agentColorMap` inside `Console` (move the `useMemo` from `App.tsx`). Fix paths.

- [ ] **Step 3: Create `DashboardArea.tsx`**

```tsx
// src/components/Workspace/DashboardArea/DashboardArea.tsx
import { WorkspaceBar } from '../WorkspaceBar/WorkspaceBar';
import { Console } from './Console/Console';
import { Dashboard } from './Dashboard/Dashboard';

export function DashboardArea() {
  return (
    <div className="flex-1 min-w-0 flex flex-col h-full">
      <WorkspaceBar />
      <div className="flex-1 min-h-0 overflow-hidden">
        <Dashboard />
      </div>
      <Console />
    </div>
  );
}
```
(`WorkspaceBar` was rendered once in `App`; it moves here. Remove its render from `App`/old main-content.)

- [ ] **Step 4: Gate, then commit**

```bash
git add -A
git commit -m "refactor(shell): build DashboardArea (Dashboard pane + Console)"
```

---

## Task 5: `Workspace` wrapper, wire `App`, dissolve `ProjectDashboard`

**Files:** Create `Workspace/Workspace.tsx`; Modify `App.tsx`; delete `ProjectDashboard/ProjectDashboard.tsx`; relocate `ProjectDashboard/types.ts` + `utils.ts`.

- [ ] **Step 1: Create `Workspace.tsx`** — owns the project-picker empty-state and the active layout.

```tsx
// src/components/Workspace/Workspace.tsx
import { Bot } from 'lucide-react';

import { ProjectProvider } from '@/store/ProjectContext';
import { useAppStore } from '@/store/useAppStore';
import { useDashboardStore } from '@/store/useDashboardStore';
import type { Project } from '@/types/dashboard.types';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

import { DashboardArea } from './DashboardArea/DashboardArea';
import { Sidebar } from './Sidebar/Sidebar';

export type WorkspaceProps = { projects: Project[] };

export function Workspace({ projects }: WorkspaceProps) {
  const selectedProject = useAppStore((s) => s.selectedProject);
  const project = useDashboardStore((s) => s.project);
  const loading = useDashboardStore((s) => s.loading);
  const openDashboard = useWorkspaceStore((s) => s.openDashboard);

  if (!selectedProject) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-3xl mx-auto px-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-5" style={{ background: 'var(--color-accent-dim)', border: '1px solid rgba(6, 182, 212, 0.15)' }}>
            <Bot size={24} className="text-accent" />
          </div>
          <h1 className="text-xl font-semibold mb-1.5 tracking-tight">Select a project</h1>
          <p className="text-sm mb-8" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{projects.length} projects detected</p>
          <div className="grid grid-cols-3 gap-2.5">
            {projects.slice(0, 9).map((p) => (
              <button key={p.id} onClick={() => openDashboard(p)} className="text-left rounded-lg p-4 transition-all duration-200 hover:translate-y-[-1px] group" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.3)'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}>
                <div className="text-[13px] font-medium mb-1 truncate group-hover:text-accent transition-colors">{p.name}</div>
                <div className="text-[11px] truncate mb-2.5" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{p.path}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loading || !project) {
    return <div className="flex-1 flex items-center justify-center text-fg-muted">Loading dashboard...</div>;
  }

  return (
    <ProjectProvider project={project}>
      <div className="flex-1 min-h-0 flex">
        <Sidebar />
        <DashboardArea />
      </div>
    </ProjectProvider>
  );
}
```
(If the picker grid pushes the file past 300 lines, extract it into a sibling `ProjectGrid.tsx`.)

- [ ] **Step 2: Slim `App.tsx`** — the main-content block becomes just `<Workspace projects={projects} />`. Keep: the loading-projects spinner, the `selectedProject→loadDashboard` effect, the sessions-watch effect, the `chatOpen` state + `<GlobalChatModal/>`. Remove: the inline picker grid, the `dashLoading`/`dashboard` plumbing now inside `Workspace`, the `<BottomPanel/>` render (now `Console` inside `DashboardArea`), the `agentColorMap` memo (moved to `Console`), and unused imports/reads. Final `App` return ≈:

```tsx
  return (
    <div className="h-full flex flex-col surface-grain" style={{ background: 'var(--color-surface-0)', color: 'var(--color-text-primary)' }}>
      <Header projects={projects} selectedProject={selectedProject} onSelectProject={openDashboard} stats={stats} activeCount={activeCount} connected={connected} onOpenChat={() => setChatOpen(true)} />
      <div className="flex-1 min-h-0 flex flex-col">
        <Workspace projects={projects} />
      </div>
      <Footer />
      {chatOpen ? <GlobalChatModal onClose={() => setChatOpen(false)} /> : null}
    </div>
  );
```
Add `import { Workspace } from '@/components/Workspace/Workspace';`. `agents` is still needed if `App` computes nothing now — remove the `agents`/`events` reads if they became unused (events may still be unused after Console self-reads — let lint decide).

- [ ] **Step 3: Dissolve `ProjectDashboard`** — delete `ProjectDashboard/ProjectDashboard.tsx` and the now-orphaned `ProjectDashboard/MainContent` if still present (it was already removed in the dashboard refactor; if a stub remains, remove it). Relocate the two shared modules: `git mv ProjectDashboard/types.ts Workspace/types.ts` and `git mv ProjectDashboard/utils.ts Workspace/utils.ts`, then fix all importers (move procedure). After this the `ProjectDashboard/` folder should be empty — remove it. Verify nothing imports `components/ProjectDashboard/` anymore: `grep -rn "components/ProjectDashboard" src` → no matches.

- [ ] **Step 4: Gate, then commit**

```bash
git add -A
git commit -m "refactor(shell): Workspace wrapper, slim App, dissolve ProjectDashboard"
```

---

## Task 6: Update `src/CLAUDE.md`

**Files:** Modify `src/CLAUDE.md`.

- [ ] **Step 1: Document the shell** — in the **Layout** and **Component placement** sections, add the app-shell tree so future work follows it:

```
components/
├── Header/                  ← top bar (logo, ProjectSwitcher, StatsBar, Chat)
├── Footer/                  ← thin status band
└── Workspace/               ← middle shell
    ├── Workspace.tsx        ← Sidebar | DashboardArea (or project picker)
    ├── WorkspaceBar/        ← project tabs   ProjectPicker/
    ├── Sidebar/             ← Activity + Library  (ConversationList, PanelsArea, …)
    └── DashboardArea/       ← WorkspaceBar + Dashboard + Console
        ├── Dashboard/       ← internal tabs + bodies (InternalTabBar, UtilityPanel, …)
        └── Console/         ← terminal panel
```
Update the example that referenced `ProjectDashboard/MainContent/SessionViewer` (now removed) to a current path. Keep edits surgical; don't rewrite unrelated sections.

- [ ] **Step 2: Gate (lint/tsc unaffected), commit**

```bash
git add src/CLAUDE.md
git commit -m "docs(src): document the new app shell structure"
```

---

## Task 7: Full gate + manual verification

- [ ] **Step 1: Full gate**

```bash
npx tsc --noEmit -p tsconfig.web.json
npm run lint
npx vitest run
npx electron-vite build
grep -rn "components/ProjectDashboard" src || echo "ProjectDashboard fully dissolved"
```
Expected: typecheck 0; lint 0/0; tests pass; build exit 0; no `ProjectDashboard` references.

- [ ] **Step 2: Manual visual check (`npm run dev`)**
- App fills the window; **no page scroll**; Header on top, thin Footer at the bottom.
- Left **Sidebar runs full height**; right side has project tabs / dashboard / console.
- Opening/switching/closing project tabs, internal tabs, the ☰ panel, and the console all still work.

- [ ] **Step 3: Final commit (only if a verification fix was needed)**

```bash
git add -A
git commit -m "chore(shell): restructure verification fixes"
```

---

## Notes

- **Heavy on moves, light on logic:** almost nothing changes behaviourally — it's `git mv` + import-path fixes + a few thin new wrappers. The gate (`tsc`) is the safety net for missed import updates; keep running it until 0.
- **`types.ts` / `utils.ts` homes:** placed under `Workspace/` for now; the `component-structure-cleaner` agent can refine later.
- **Follow-ups (not in this plan):** Footer content (git branch), macOS title-bar fix, and updating the `component-structure-cleaner` agent to encode this shell (done in the main session — `.claude/` is not writable from a background worktree).
