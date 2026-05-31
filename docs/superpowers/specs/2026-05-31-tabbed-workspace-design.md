# Design — Tabbed multi-project Workspace (Chrome-style)

**Date:** 2026-05-31
**Status:** Approved (brainstorming) — pending implementation plan
**Pillar:** Multi-project dashboards (Pillar #3) — `docs/roadmap.md`
**Scope tag:** MVP (no tab persistence)

> **Supersedes** `2026-05-31-project-dashboard-design.md`. That spec's two-level
> "Project ⟷ Agent" model and its inner `Chat/Context/Task/Plan` tab bar are
> **reworked** here. Reusable from the merged work: the `_ui/Tabs` primitive,
> `ChatTab`, `ContextTab`, and the `useDashboardUIStore` navigation pieces. The
> inner `Chat/Context/Task/Plan` *tab bar* is removed (Context/Task/Plan move to
> a hamburger slide-over; Chat becomes the default internal tab).

## Problem

The app opens **one** project at a time: `useAppStore.selectedProject` is a
singleton, and `App.tsx` renders a project picker until one is chosen, then a
single `ProjectDashboard`. The user wants a **Chrome-style multi-project
workspace**: several projects open as top-level tabs, each its own dashboard,
each with its own set of conversation/agent tabs, and a left sidebar that always
reflects the **active** tab's project.

## Core framing (decided)

Two levels of tabs:

- **Level 1 — external project tabs (Chrome-style).** Each tab = one open
  **project/repo**. `+` opens a new tab (project picker). `×` closes a tab.
  Scope of everything below = the active tab's project.
- **Level 2 — internal conversation/agent tabs.** Inside the active project's
  dashboard, a tab strip of open **conversations and agents**. The first is a
  **Chat** by default. An internal `+` opens a small menu: **New chat / Open
  agent / Resume conversation**. Internal tabs are closable.

Supporting decisions:

- **Left sidebar is scoped to the active project tab's repo.** `Activity` =
  that repo's conversations; `Library` = that repo's agents/skills/hooks **plus
  the user-global agents** (`~/.claude`, shared across every project). Clicking
  an item in the sidebar opens/activates an internal tab in the active
  dashboard.
- **Context / Task / Plan are not tabs.** They live behind a **hamburger (☰)
  button** that opens a **right slide-over panel** over the dashboard.
- **No persistence (MVP).** On launch: one external tab with a default Chat on
  the last project; open tabs are not restored. Chrome-style restore is deferred.

## Architecture

### New state: `useWorkspaceStore`

The source of truth for the tab tree. The existing `useAppStore.selectedProject`
singleton is **kept and bridged**: whenever the active external tab changes, the
store sets `selectedProject` to that tab's project, so all existing
project-scoped code (`App.tsx`, `ProjectProvider`/`useProject`, `AgentChat`'s
`cwd`, `useSessions`, `useFavorites`, `BottomPanel`) keeps working unchanged.

```ts
type InternalTab = {
  id: string;
  kind: 'chat' | 'agent' | 'skill'; // chat surface | agent dashboard | skill detail
  title: string;
  agentName?: string;               // set for kind 'agent', or an agent-bound chat
  skillId?: string;                 // set for kind 'skill'
  resumeSessionId?: string;         // set when resuming a past conversation
};

type Dashboard = {
  id: string;
  project: Project;                // from @/types/dashboard.types
  tabs: InternalTab[];
  activeTabId: string;
};

type WorkspaceState = {
  dashboards: Dashboard[];
  activeDashboardId: string | null;
  // external (project) tabs
  openDashboard: (project: Project) => string;   // dedupe by project.id; returns id
  closeDashboard: (id: string) => void;
  setActiveDashboard: (id: string) => void;       // also syncs useAppStore.selectedProject
  // internal (conversation/agent) tabs — operate on the active dashboard
  addTab: (tab: Omit<InternalTab, 'id'>) => string;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
};
```

- `openDashboard` dedupes: opening an already-open project just activates its
  tab. A new dashboard starts with one default `chat` tab.
- `closeDashboard` on the active tab activates a neighbour; closing the last one
  returns to the project-picker (clears `selectedProject`).
- `closeTab` on the active internal tab activates a neighbour; closing the last
  internal tab leaves a default `chat` tab (a dashboard always has ≥1 tab).

### Component tree

```
App
└── WorkspaceBar              (NEW — external project tabs: [Proj A][Proj B][+])
└── (active dashboard)
    └── ProjectProvider project={activeDashboard.project}
        └── ProjectDashboard  (reworked)
            ├── Sidebar        (existing: ConversationList + PanelsArea, repo-scoped)
            ├── InternalTabBar (NEW — [Chat][agent:x][conv:y][+menu]  + ☰ hamburger)
            ├── (active internal tab body)
            │     kind 'chat'  → AgentChat (general or resume)
            │     kind 'agent' → AgentDetail (the agent dashboard, unchanged)
            │     kind 'skill' → SkillDetail
            └── UtilityPanel   (NEW — right slide-over: Context | Task | Plan)
```

The old `MainContent` view-router (`view` → agent/skill/session/chat/project) is
**absorbed** by `InternalTabBar` + the active-internal-tab body: agents, skills,
and resumed conversations all become internal tabs instead of swapping a single
`view`. `MainContent` is reduced to (or replaced by) the `ProjectView` body; the
`useDashboardUIStore.view`/`selectedAgent`/`selectedSkill` routing is retired
where the tab tree now carries that state (the plan resolves the exact store
trim).

## Components & changes

- **NEW `src/components/Workspace/WorkspaceBar/WorkspaceBar.tsx`** — the external
  project tab strip. Renders one tab per `dashboards` entry (project name + `×`),
  a `+` that opens the project picker, and switches `activeDashboardId` on click.
  Lives above the dashboard in `App.tsx`.
- **NEW `src/components/Workspace/ProjectPicker/ProjectPicker.tsx`** — the `+`
  target: a small popover/list of available projects (reuses the data behind the
  current `App.tsx` project grid) → `openDashboard(project)`. (The existing full
  project grid in `App.tsx` becomes the empty-state when no dashboard is open.)
- **NEW `src/components/ProjectDashboard/InternalTabBar/InternalTabBar.tsx`** —
  the L2 dynamic, closable tab strip for the active dashboard (built on a
  closable variant of `_ui/Tabs`). Includes the internal `+` menu (New chat /
  Open agent / Resume conversation) and the **☰ hamburger** that toggles the
  `UtilityPanel`.
- **EXTEND `src/components/_ui/Tabs/Tabs.tsx`** — add optional `onClose?: (key)`
  per tab → renders an `×`; keep the existing API backward-compatible.
- **NEW `src/components/ProjectDashboard/UtilityPanel/UtilityPanel.tsx`** —
  right slide-over hosting `ContextTab` (kept), `TaskTab` (kept skeleton),
  `PlanTab` (kept skeleton), selected via a small inner switch. Opens/closes from
  the hamburger. Overlay + slide animation; click-outside / Esc closes.
- **REWORK `src/components/ProjectDashboard/ProjectView/ProjectView.tsx`** —
  stop rendering the 4-tab bar; instead render `<InternalTabBar />` + the active
  internal tab body (`ChatTab` for `chat`, `AgentDetail` for `agent`) +
  `<UtilityPanel />`. Reuse `ChatTab` (general/resume via the active tab's
  `agentName`/`resumeSessionId`).
- **REWORK `src/components/ProjectDashboard/ConversationList/ConversationList.tsx`**
  — clicking a conversation calls `workspace.addTab({ kind:'chat', … })` (or
  activates it if already open) in the active dashboard. Operates on the active
  dashboard's project.
- **REWORK `src/components/ProjectDashboard/PanelsArea/...` (agent rows)** —
  clicking an agent calls `workspace.addTab({ kind:'agent', agentName, title })`.
- **MODIFY `src/App.tsx`** — render `<WorkspaceBar />` above the dashboard area;
  drive the dashboard from `activeDashboard` instead of the bare
  `selectedProject`; the project grid becomes the "no tabs open" empty state.
- **MODIFY `src/store/useDashboardUIStore.ts`** — drop `projectTab` (the inner
  4-tab state); keep `view`/selection pieces still used by `AgentDetail`.

## Data flow

- **Active project** is derived from `activeDashboardId` → `dashboards[].project`;
  `setActiveDashboard` mirrors it into `useAppStore.selectedProject` so the
  existing `ProjectProvider`/`useProject` and all project-scoped hooks resolve to
  the active tab's repo automatically.
- **Sidebar** reads the active dashboard's project (via `useProject`, which now
  reflects the active tab) and dispatches sidebar clicks into
  `workspace.addTab`/`setActiveTab`.
- **Agent scope:** `Library` shows project agents (active repo's `.claude`) +
  user-global agents (`~/.claude`); user agents appear in every dashboard, project
  agents only in their own — this is the existing `scope` distinction, now keyed
  to the active tab's repo rather than a global toggle.
- **Internal `+` menu:** New chat → `addTab({kind:'chat', agentName:''})`; Open
  agent → pick from the repo's agents → `addTab({kind:'agent', agentName})`;
  Resume conversation → pick a past session → `addTab({kind:'chat', agentName,
  resumeSessionId})`.

## Error handling

- **No dashboards open** → the project picker (today's grid) as the empty state.
- **Opening an already-open project** → activate its existing tab (no duplicate).
- **Closing the last internal tab** → keep a default `chat` tab (never an empty
  dashboard body).
- **Closing the last external tab** → return to the project picker; clear
  `selectedProject`.
- **Resume with a missing session** → fall back to a fresh chat for that agent.
- **Utility panel with no live data** → `ContextTab` already renders empty
  states; Task/Plan are static placeholders.

## Testing

- **TDD `useWorkspaceStore`** (Vitest): `openDashboard` dedupes by project id;
  `closeDashboard`/`closeTab` activate a neighbour and never leave an empty
  dashboard; `addTab` appends + activates; `setActiveDashboard` updates the
  active id. (Mirroring `selectedProject` is asserted via the store call.)
- **TDD the closable `_ui/Tabs`** extension: an `×` renders only when `onClose`
  is provided and fires with the tab key; existing Tabs tests still pass.
- **Layout** (WorkspaceBar, InternalTabBar, UtilityPanel slide-over): typecheck
  + lint (0/0) + `npx electron-vite build` + manual visual check.

## MVP scope vs deferred

**In MVP:** external project tabs (+/×, dedupe), internal conversation/agent
tabs (+ menu, ×), repo-scoped sidebar, hamburger → Context/Task/Plan slide-over
(Context functional, Task/Plan skeletons), `selectedProject` bridge.

**Deferred (separate specs / feature requests):**
- **Tab persistence** across restarts (Chrome-style session restore).
- **Real Task (Jira)** and **Plan** content — slide-over keeps skeletons.
- **Live `.claude` real-time mirror** / live agent activity (Part B).
- **Right action sidebar** (edit file/table) — the `UtilityPanel` reserves the
  right-side slot but does not implement those actions.
- **Drag-to-reorder / detach** tabs.

## Non-goals

- No change to `AgentDetail`'s internals (it is the `agent` internal-tab body,
  used as-is).
- No new backend for Task/Plan; Context reuses existing stores/IPC.
- Not redesigning the global launch page beyond reusing its project list for the
  picker.
