# Design — App shell component restructure

**Date:** 2026-06-01
**Status:** Approved (brainstorming) — pending implementation plan
**Pillar:** UX beyond the terminal (Pillar #1) + clean architecture
**Scope tag:** MVP — structural shell only

## Problem

`App.tsx` (172 lines) holds the top bar inline, the project-tabs strip, the
project picker, `ProjectDashboard` (which itself bundles the sidebar + the
dashboard body), and `BottomPanel` (the console) all stacked ad-hoc. There is
no explicit, named shell, no `Footer`, the sidebar doesn't own its full height,
and the folder tree doesn't mirror the intended component hierarchy.

## Target shell (decided)

```
App  (h-full flex col, fixed — NO page scroll)
├── Header
├── Workspace            (flex-1, min-h-0, flex row)
│   ├── Sidebar          (left — full height; Activity + Library)
│   └── DashboardArea    (right — flex-1, flex col)
│       ├── WorkspaceBar (project tabs — top strip)
│       ├── Dashboard    (flex-1 — internal tabs + bodies; or project picker empty-state)
│       └── Console      (bottom — the terminal panel)
└── Footer               (thin empty band — placeholder this phase)
```

Decisions from brainstorming:
- **Naming:** `Workspace` (middle) / `DashboardArea` (right column) / `Dashboard`
  (top pane) / `Console` (bottom). Plus `Header`, `Footer`, `Sidebar`.
- **Project tabs (`WorkspaceBar`) live at the top of `DashboardArea`** (not
  full-width under the header). The `Sidebar` spans header→footer on the left.
- **Scope = structural shell only.** Footer is a thin empty placeholder band.
  Out of scope (separate backlog items): footer content (git branch), macOS
  title-bar overlap fix.

## Folder-collision resolution

`components/Workspace/` already exists (holds `WorkspaceBar/` + `ProjectPicker/`).
It **becomes the middle-wrapper feature folder** — `Workspace.tsx` is added at
its root, and `Sidebar/` + `DashboardArea/` join `WorkspaceBar/` + `ProjectPicker/`
as its children. No name clash.

## Target component tree

```
components/
├── Header/Header.tsx                      ← extracted from App.tsx top bar
├── Footer/Footer.tsx                      ← NEW (empty band placeholder)
└── Workspace/
    ├── Workspace.tsx                      ← NEW middle wrapper: ProjectProvider? Sidebar | DashboardArea
    ├── WorkspaceBar/                      ← unchanged (project tabs)
    ├── ProjectPicker/                     ← unchanged
    ├── Sidebar/                           ← extracted from ProjectDashboard
    │   ├── Sidebar.tsx                    ← Activity (ConversationList) + Library (PanelsArea) + ResizeHandle
    │   ├── ConversationList/  PanelsArea/  ResizeHandle/
    │   ├── AgentList/ AgentRow/ SkillRow/ HookRow/ SectionLabel/ OrchestratorTree/   (sidebar leaves)
    └── DashboardArea/
        ├── DashboardArea.tsx              ← WorkspaceBar + Dashboard + Console
        ├── Dashboard/                     ← = today's ProjectView (renamed)
        │   ├── Dashboard.tsx              (was ProjectView.tsx)
        │   ├── InternalTabBar/ UtilityPanel/ ChatTab/ SkillDetail/
        └── Console/                       ← = today's BottomPanel (moved+renamed)
            ├── Console.tsx                (was BottomPanel.tsx)
            └── TerminalView/
```

`ProjectDashboard/` is **dissolved**: `ProjectDashboard.tsx` is removed; its
shared `types.ts` / `utils.ts` move to wherever their consumers land (likely
`Workspace/` root or kept as siblings — the plan resolves exact homes via the
import graph). `SkillDetail` follows the Dashboard pane (it's an internal-tab body).

## App shell behaviour

- `App.tsx` becomes thin: `<Header/>` · `<Workspace/>` (flex-1) · `<Footer/>`,
  inside a fixed `h-full flex flex-col` with **no page scroll** — only inner
  panes (sidebar list, dashboard body, console) scroll.
- **`Header`** owns the existing top bar: logo + name, `ProjectSwitcher`,
  `StatsBar`, the global Chat button, the `titlebar-drag` region + `pl-20` mac
  inset. `GlobalChatModal` open-state stays where it's triggered (App or Header).
- **`Workspace`** renders the project picker empty-state when no project is open;
  when a dashboard is active it wraps `Sidebar | DashboardArea` in
  `ProjectProvider` (so both get project context). The `selectedProject`→dashboard
  load effect and the sessions-watch effect stay in App (or move to Workspace —
  plan decides; they must run once).
- **`DashboardArea`** stacks `WorkspaceBar` (tabs) / `Dashboard` (flex-1) /
  `Console`. `Console` (BottomPanel) keeps its `events` / `agentColorMap` /
  `projectPath` props.
- **`Footer`** is a thin band (e.g. 22px) using the design-system tokens — empty
  for now, ready to host the git-branch status later.

## Migration approach (staged, gate-green each step)

Heavy because of the moves. The plan stages it so every task compiles, lints
0/0, tests pass, and builds before commit:
1. Extract `Header`.
2. Add `Footer` + make `App` the fixed no-scroll Header/body/Footer shell.
3. Extract `Sidebar` (move sidebar leaves under `Workspace/Sidebar/`).
4. Build `DashboardArea` (move `ProjectView`→`Dashboard/`, `BottomPanel`→`Console/`).
5. Add `Workspace` wrapper, wire `App`, dissolve `ProjectDashboard`.
6. Update `src/CLAUDE.md` to document the new shell.

Each move is `git mv` (preserve history) + repo-wide import-path fixes, verified
by `tsc`. The 300-line cap still applies to every touched file.

## Error handling

- No project open → `Workspace` shows the project-picker empty state; no
  `Sidebar`. `Console` still renders (terminal with `projectPath: null`).
- Renames keep component names aligned with files (e.g. `ProjectView`→`Dashboard`):
  update the symbol, not just the path, so imports read cleanly.

## Testing

- No new unit tests (pure structural move + layout). Verification = `tsc` 0,
  `lint` 0/0, full `vitest` suite still green (the existing
  `useWorkspaceStore` / `Tabs` / store tests must keep passing), and
  `electron-vite build` exit 0. Manual visual check: app fills the window with no
  page scroll, sidebar runs full height, footer band visible, tabs/dashboard/
  console intact.

## Non-goals / follow-ups

- **Footer content (git branch)** and **macOS title-bar overlap fix** — separate
  backlog items (Cluster A).
- **`component-structure-cleaner` agent update** to encode this shell — a
  follow-up done in the main session (the `.claude/` tree can't be written from a
  background worktree).
- No behaviour change to chat/agent/skill bodies, the tab logic, or the stores
  beyond what the moves require.
