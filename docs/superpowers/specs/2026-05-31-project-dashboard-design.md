# Design — Per-project Dashboard (two-level: Project ⟷ Agent)

**Date:** 2026-05-31
**Status:** Approved (brainstorming) — pending implementation plan
**Pillar:** Multi-project dashboards (Pillar #3) — `docs/roadmap.md`
**Scope tag:** MVP

## Problem

A project's main content area today is an ad-hoc set of header tabs (`Tree` /
`Session` / `Costs`) plus sidebar-driven views (agent editor, skill detail,
session viewer, chat, landing page), all routed through a single global
`useDashboardUIStore.view`. There is no coherent **project-level dashboard**.
The user wants a real per-project dashboard with the tabs **Chat · Context ·
Task · Plan**, while keeping the existing agent dashboard (`AgentDetail`) as-is.

`Tree` and `Session` tabs are unclear and slated for removal (`docs/bugs.md`).

## Core framing (decided)

**Two levels, one main area**, driven by the existing `useDashboardUIStore.view`:

- **Level 1 — Project Dashboard**: the default view when a project is open.
  Tabs: `Chat · Context · Task · Plan`. Replaces the current default
  (`view: 'none'` → `LandingPage`).
- **Level 2 — Agent Dashboard**: the existing `AgentDetail`, **unchanged**.
  Entered by clicking an agent in the Library sidebar. A "‹ Back to project"
  breadcrumb returns to Level 1.

Navigation distinction:
- Click an **agent** in **Library** → Level 2 (Agent Dashboard).
- Click a **conversation** in **Activity** → stays Level 1; the **Chat** tab
  shows that conversation.

## Decisions (from brainstorming)

- **Nav model: two-level Project ⟷ Agent** (chosen over "replace header tabs"
  and "dashboard-as-a-tab").
- **Tabs = exactly 4**: `Chat · Context · Task · Plan`. **Remove** `Tree` +
  `Session`. **Costs is folded into the Context tab** (live context % + the
  existing `CostDashboard`).
- **Chat tab = host of the active conversation**: defaults to a general
  project-scoped chat (no specific agent); selecting a conversation in Activity
  swaps it in.
- **MVP functional scope: Chat + Context functional**; **Task + Plan are pure
  skeletons** (labeled "Coming soon" placeholders).
- **New `_ui/Tabs` primitive** for the project dashboard. **`AgentDetail` is NOT
  migrated** — it keeps its own inline tab bar (it works; don't touch it).
- **Dashboard state resets on project change** (the store is global, not
  per-project keyed).

## Target structure

```
Level 1 — Project Dashboard (default)
┌──────────────┬───────────────────────────────────────┐
│ ACTIVITY     │  [ Chat ] Context  Task  Plan          │
│  ● conv …    │  ─────────────────────────────────────│
│  ○ conv …    │  Chat: general project chat by default,│
│ LIBRARY      │  or the conversation picked in Activity │
│  ★ Favorites │                                         │
│  Agents …    │                                         │
└──────────────┴───────────────────────────────────────┘

Level 2 — Agent Dashboard (click an agent in Library)
  ‹ Back to project · my-agent   Chat | Overview | Prompt | Memory | Files
  (today's AgentDetail, untouched)
```

## Components & changes

- **NEW `src/components/_ui/Tabs/`** — reusable tab bar primitive.
  `Tabs.tsx` + `index.ts` barrel (the only folder kind that gets a barrel).
  Props: `tabs: { key: string; label: string; icon?: ReactNode }[]`,
  `active: string`, `onChange: (key: string) => void`. Styling reproduces the
  current look via CSS vars (`--color-accent`, `--color-surface-1/3`,
  `--color-border(-subtle)`, `--color-text-muted`). Keyboard: arrow-key
  navigation between tabs (accessibility), `role="tab"`/`role="tablist"`.
- **NEW `src/components/ProjectDashboard/ProjectView/`** — the Level-1 container.
  - `ProjectView.tsx` — reads `projectTab` from `useDashboardUIStore`, renders
    `<Tabs>` + the active tab body.
  - `ChatTab/ChatTab.tsx` — mounts `<AgentChat agentName={activeAgentName} />`.
    Default `activeAgentName = ''` (general; the spawn path already maps `''` →
    `agent_name: undefined`). When `activeConversationId` is set, mounts that
    conversation's chat instead. Requires `useAppStore.selectedProject` (already
    used by `AgentChat` for `cwd`).
  - `ContextTab/ContextTab.tsx` — composes a live context gauge (from
    `useEventsStore.agentContexts`, reusing `<ContextBar>`) **and** the existing
    `<CostDashboard />`. No new backend.
  - `TaskTab/TaskTab.tsx` — skeleton: a centered "Coming soon — Jira tasks"
    placeholder. No logic.
  - `PlanTab/PlanTab.tsx` — skeleton: a centered "Coming soon — Plans"
    placeholder. No logic.
- **MODIFY `src/components/ProjectDashboard/MainContent/MainContent.tsx`** —
  - Remove the hardcoded header-tab row (`Tree` / `Session` / `Costs`) and the
    `tree` and `costs` render branches.
  - Add a `view === 'project'` branch → `<ProjectView />` and make it the
    fallback default (replacing `LandingPage` as the default).
  - **Keep** the `session` branch — session viewing stays reachable from the
    Library → History sidebar (it just loses its header tab). Keep `agent`,
    `skill`, `chat` (resume) branches.
  - Drop the now-unused `LandingPage` import/render (the component file stays on
    disk for the launch-page refactor; it's simply no longer the default).
- **MODIFY `src/components/ProjectDashboard/types.ts`** — add `'project'` to the
  `MainView` union; add a `ProjectTab = 'chat' | 'context' | 'task' | 'plan'`
  type.
- **MODIFY `src/store/useDashboardUIStore.ts`** —
  - `view` initial value → `'project'` (was `'none'`).
  - New state: `projectTab: ProjectTab` (init `'chat'`),
    `activeConversationId: string | null` (init `null`).
  - New actions: `setProjectTab(tab)`, `setActiveConversation(id)`,
    `backToProject()` → `set({ view: 'project', selectedAgent: null })`.
- **MODIFY `src/components/AgentDetail/AgentDetail.tsx`** — add a "‹ Back to
  project" affordance that calls `backToProject()`. (Minimal, additive — no tab
  refactor.)
- **MODIFY `ConversationList`** — clicking a conversation calls
  `setActiveConversation(id)` + `setView('project')` + `setProjectTab('chat')`
  (instead of whatever it does today), so it lands in the Chat tab.

## Data flow

- **Single source of truth** stays `useDashboardUIStore`. `view` selects the
  level (`project` vs `agent`/`skill`/`chat`); `projectTab` selects the Level-1
  tab; `activeConversationId` selects which conversation the Chat tab hosts.
- **Reset on project change**: a `useEffect` keyed on
  `useAppStore.selectedProject?.path` resets `view:'project'`,
  `projectTab:'chat'`, `activeConversationId:null`. Lives in `ProjectDashboard`
  (the component that owns the project context).
- **Context tab data** is read-only from existing stores/IPC — no new backend.

## Error handling

- **Chat tab, no project selected** → a quiet "Select a project to start
  chatting" state (don't mount `AgentChat` without a `cwd`).
- **Context tab, no live data** → gauge shows 0%; `CostDashboard` already
  renders empty states for its charts.
- **Task / Plan tabs** → always their static placeholder; nothing can error.
- **Removed views**: `AgentTree` is **kept in the codebase** (not deleted) but
  no longer routed from `MainContent` (the Tree header tab is gone).
  `SessionViewer` **stays routed** via the `session` view so the Library →
  History sidebar still opens past sessions.

## Testing

- **TDD** the `_ui/Tabs` primitive (Vitest + RTL): renders tabs, marks the
  active one, fires `onChange` on click, arrow-key navigation moves selection.
- **TDD** the store reducer logic: `setProjectTab` updates `projectTab`;
  `backToProject` sets `view:'project'` and clears `selectedAgent`;
  reset-on-project-change yields the default trio.
- **Skeletons + layout** (ProjectView, ContextTab composition): typecheck +
  lint (0/0) + `npx electron-vite build` + manual visual check.

## Non-goals (separate specs / feature requests)

- **Real Task (Jira) integration** — Task tab is a skeleton here. Jira/missions
  wiring is a later feature (`docs/feature-requests.md`).
- **Plan content** — skeleton only; no in-app plan storage yet.
- **Launch page refactor** — tracked separately in `docs/feature-requests.md`;
  this spec only removes `LandingPage` as the project default, it does not
  redesign a global launch page.
- **Migrating `AgentDetail` to the `_ui/Tabs` primitive** — explicitly out of
  scope (the agent dashboard works; leave it).
- **Real-time `.claude` mirror / live agent activity** — Part B, separate.
- **Action-awaited notifications, header usage bar, `/`+`@` menus, table
  export** — separate feature requests.
