# Frontend state management refactor — design

**Date:** 2026-05-29
**Scope:** `src/` (Electron renderer / React 19)
**Goal:** Replace prop drilling with a principled split of Props / Context / Zustand.

## Problem

The renderer currently puts almost all global state in three top-level hooks consumed in `App.tsx`, then drills everything down through `ProjectDashboard` to its descendants.

Worst offenders (measured):

| Component | Props received | Props passed to children |
|---|---|---|
| `ProjectDashboard` | 9 | 49 (to PanelsArea + MainContent + sidebar children) |
| `PanelsArea` | 31 | — |
| `MainContent` | 22 | — |

Concrete consequences:
- `AgentRow` re-renders on every IPC event for any agent, because `activeAgents`/`agentContexts` are drilled as full collections.
- `onRefresh` is drilled **7 levels deep** (`App → ProjectDashboard → MainContent → AgentDetail → MemoryManager → MemoryFileCard`, and an equivalent chain on the sidebar side).
- `project.id` / `project.path` / `project.name` are passed in 3+ different prop names through 3 levels, while the same project lives in `useAppStore`.

## Design rule applied

- **Props** = data identity of a leaf component (an `agent`, a `skill`, a `hook`).
- **Context** = global state that is **stable** during a session (configuration-like).
- **Zustand** = global state that **mutates frequently**, or that requires fine-grained subscriptions to avoid wide re-renders.

## Solution overview

**1 React Context** + **5 Zustand stores** + leaf props preserved.

### `ProjectContext`

```ts
type ProjectContextValue = {
  project: Project;        // null state handled above the Provider
  projectId: string;       // derived
  projectName: string;     // derived
  projectPath: string;     // derived
  isUserProject: boolean;  // derived (project.id === "user")
  refresh: () => void;     // dashboard invalidation
};
```

- Mounted by `App.tsx` just above `ProjectDashboard`, **only when `selectedProject` is non-null**, so consumers never deal with null.
- `project` is sourced from `useAppStore` (existing Zustand store — kept as source of truth for `setSelectedProject`).
- `refresh` is the `refresh` returned by `useDashboardStore` (see below).
- Value object is memoized with `useMemo` to avoid re-rendering all consumers on parent renders.

### Zustand stores

| Store | State | Actions | Source today |
|---|---|---|---|
| `useEventsStore` | `events`, `connected`, `activeAgents`, `agentContexts`, `currentTools`, `waitingAgents` | `ingestEvent`, internal timers | `useIPC` |
| `useDashboardStore` | `agents`, `skills`, `hooks`, `loading` | `loadDashboard(projectId)`, `refresh()`, `toggleLink(name, linked)`, `deleteAgent(name)` | `useDashboard` |
| `useDashboardUIStore` | `view`, `selectedAgent`, `selectedSkill`, `selectedSessionId`, `openPanels`, `scopeTab`, `resumeChat` | `setView`, `selectAgent`, `selectSkill`, `selectSession`, `togglePanel`, `setScopeTab`, `setResumeChat` | local `useState` in `ProjectDashboard` |
| `useChatsStore` | `openChats` | `addOpenChat`, `updateChatTitle`, `removeChat`, `startChat(agentName, sessionId, message)` | local `useState` + `useAutoChatTitles` |
| `useFavoritesStore` | `favorites: Record<projectId, FavoriteItem[]>` | `loadFavorites(projectId)`, `toggle(projectId, type, name)`, `isFavorite(projectId, type, name)` | `useFavorites` |

`useAppStore` (existing) keeps `selectedProject` + `setSelectedProject`. Not merged into the new stores — it's the entry point for project switching from outside the Provider.

Sessions stay in a hook (`useSessions`) because they are scoped to `projectPath` and only consumed in two places (sidebar + viewer). Promoting to a store now is YAGNI; can be done later if a third consumer appears.

### Leaf component selectors

Leaf rows (`AgentRow`, `SkillRow`, `HookRow`) receive **only their data** (the agent/skill/hook) as props. State *about* that item is read inside via Zustand selectors keyed by id. This is the critical re-render isolation:

```ts
function AgentRow({ agent }: { agent: AgentFile }) {
  const active = useEventsStore((s) => s.activeAgents.has(agent.id));
  const context = useEventsStore((s) => s.agentContexts.get(agent.id));
  const isFav = useFavoritesStore((s) => s.isFavorite(projectId, "agent", agent.id));
  // ...
}
```

A re-render of one agent's context no longer re-renders the entire `AgentList`.

## Migration mapping (representative)

Full prop-by-prop table is in the brainstorming exchange that preceded this doc. Below is the structural summary.

### Eliminated entirely (become store reads or context reads)

- `App → ProjectDashboard`: 9 props → **0 props**
- `ProjectDashboard → PanelsArea`: 31 props → **0 props**
- `ProjectDashboard → MainContent`: 22 props → **0 props**
- `ProjectDashboard → ActiveSessions`: 5 props → **0 props**
- `ProjectDashboard → OpenChatsList`: 4 props → **0 props**

### Preserved as props (data identity)

- `AgentRow.agent`, `SkillRow.skill`, `HookRow.hook`, `Accordion.label`, `AgentDetail.agent`, `AgentChat.agentName/resumeSessionId/initialMessage`, etc.
- `onAgentAction` (closure depending on local list filtering) — kept as prop for clarity.

## Non-goals

- No introduction of TanStack Query or other data-fetching library. IPC calls stay in store actions.
- No refactor of components that are already isolated (`StatsBar`, `ProjectSwitcher`, `EventConsole`, `CostDashboard`, `GlobalChatModal`, `SessionViewer`).
- No conversion of `window.api` to a Context. Testability gain only; deferred until tests exist.
- No `useSessions` → store migration (YAGNI).
- No new theme / i18n / feature-flag system — none exist in the codebase today.

## Verification per phase

Each phase ends with:

1. `npm run typecheck` clean.
2. `npm run lint` clean.
3. `npm run dev` launched, manual smoke test of the dashboard touching:
   - Project switch
   - Agent select + edit
   - Skill select
   - Session select + resume
   - Chat open + close
   - Favorite toggle
   - Live IPC event (any active session triggers `activeAgents` update)

## Implementation order

Phases are ordered to minimize cross-phase churn. Each phase is one commit per the user's per-phase workflow.

1. **`useEventsStore`** — biggest win on re-renders. Replace `useIPC` with the store; `AgentRow` and other consumers read via selectors. Delete `useIPC.ts`.
2. **`useDashboardStore`** — replace `useDashboard` + the dashboard-data drilling. Move `toggleLink` / `deleteAgent` here.
3. **`ProjectContext`** — add the Provider in `App.tsx`, expose `useProject()`. Refactor `onRefresh` chain and `projectName/Id/Path` chains.
4. **`useFavoritesStore`** — replace `useFavorites`. Selectors in `AgentRow`, `SkillRow`, `HookRow`.
5. **`useDashboardUIStore`** — move `view`, `selectedAgent`, `selectedSkill`, `selectedSessionId`, `openPanels`, `scopeTab`, `resumeChat`. This is where `PanelsArea` and `MainContent` drop their remaining props.
6. **`useChatsStore`** — move `openChats` + `useAutoChatTitles` integration.
7. **Cleanup** — delete now-unused props from `ProjectDashboardProps`, `PanelsAreaProps`, `MainContentProps`; collapse derived-data props (`projectAgents`, `userAgents`, `favAgents`, etc.) into store selectors.

## Risks

- **Selector identity churn** — Zustand selectors that return new collections (`new Set`, `new Map`) on every call cause re-renders. Mitigation: stores must return existing references and use `Object.is` equality (Zustand default) or `useShallow` for object selectors.
- **Phase 5 blast radius** — `useDashboardUIStore` touches both sidebar and main content simultaneously. Tested in isolation in dev before merge.
- **Memoization of `ProjectContext.value`** — required to avoid invalidating all consumers on every parent render.

## Out of scope for this spec

- Cost dashboard refactor
- Memory viewer refactor (beyond receiving `refresh` from context)
- Test suite introduction
- Storybook / component documentation
