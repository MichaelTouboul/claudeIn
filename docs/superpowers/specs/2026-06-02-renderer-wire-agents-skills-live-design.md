# Renderer wiring — agents & skills live (Approach A) — design

**Date:** 2026-06-02
**Status:** Approved (design) — pending implementation
**Scope:** Frontend (renderer) + a small backend `getSkill` addition. First renderer-wiring slice.

## Context

The agents/skills mirrors (live read+watch+broadcast) are merged backend, but the renderer
still reads agents/skills via the **pull** path: `useDashboardStore.load` →
`window.api.getDashboard(projectId)` → full `AgentFile[]`/`SkillFile[]` (60 s-cached, stale
until manual refresh). This slice makes the dashboard's agent/skill **lists live** by
consuming the mirror snapshots, with the detail views fetching full content on-demand.

**Verified:** the list consumers use only fields present in the lightweight summaries —
agents: `id`, `scope`, `frontmatter` (PanelsArea, ConversationList, AddTabMenu, Console);
skills: `name`, `filePath`, `scope` (PanelsArea). Only `AgentDetail`/`SkillDetail` (opened via
`TabBody`) need full content (`body`, `memoryFiles`, `annexFiles`).

## Approach (locked: A)

- The store holds the **mirror summaries** (`AgentSummary[]`/`SkillSummary[]`), sourced from
  `getAgentsMirror`/`getSkillsMirror` + kept live by `onAgentsChanged`/`onSkillsChanged`.
- **Detail fetches full content on-demand** when an agent/skill tab opens: `AgentDetail` via
  the existing `getAgent(id)`; `SkillDetail` via a **new** `getSkill(filePath)`.
- `project` + `hooks` still come from `getDashboard`; agents/skills no longer do.

## Backend — add `getSkill` (single skill, full)

The only new backend: `getSkill(filePath: string): Promise<SkillFile | null>` reading one
`SKILL.md` fully (body + annex files), reusing `project.service`'s existing skill-parsing
(`findSkillsInDir` logic factored to read a single dir). IPC `skills:get` + preload +
`env.d.ts`. (`getAgent` already exists for agents.) Additive; existing readers untouched.

## Store reshape — `useDashboardStore`

```ts
type DashboardState = {
  project: Project | null;
  agents: AgentSummary[];     // was AgentFile[]
  skills: SkillSummary[];     // was SkillFile[]
  hooks: HookConfig[];
  loading: boolean;
  load: (projectId: string) => Promise<void>;
  refresh: () => Promise<void>;
  deleteAgent: (agentName: string) => Promise<void>;
};
```
- `load(projectId)`: resolve the project (id → path), fetch `project`+`hooks` via
  `getDashboard`, fetch initial `agents`/`skills` via `getAgentsMirror(path)`/
  `getSkillsMirror(path)`, then **start the live wiring** for that scope:
  - `unwatch` the previous scope (`unwatchAgents`/`unwatchSkills`) and unsubscribe previous
    `onAgentsChanged`/`onSkillsChanged` handlers;
  - `watchAgents(path)`/`watchSkills(path)`;
  - subscribe `onAgentsChanged`/`onSkillsChanged` → if the snapshot's `projectPath` matches the
    active scope, set `agents`/`skills` from it.
  - Keep the unsubscribe fns + active scope on the store for teardown; the load-id guard
    (`currentLoadId`) still prevents superseded loads from clobbering.
- `deleteAgent`: call `window.api.deleteAgent(name)` and let the **live watcher** refresh the
  list (no manual `refresh()` needed). `refresh()` re-runs `load(activeId)`.

The watch/subscription lifecycle lives in the store (it already owns `load`); it is the single
owner of the agent/skill data + its liveness.

## Detail views fetch full content on-demand

- **`TabBody`** (`agent` kind): find the summary by `tab.agentName`; if present, render
  `<AgentDetail agentId={tab.agentName} … />` (pass the **id**, not a full object). If absent →
  `NotFound`. (Same for `skill` kind → `<SkillDetail filePath={tab.skillId} />`.)
- **`AgentDetail`**: prop becomes `agentId: string` (was `agent: AgentFile`). On mount /
  `agentId` change, fetch `api.getAgent(agentId)` into local state with a loading + not-found
  state; render once loaded. Keep `onDelete`/`onAgentUpdated`. (It already calls `api.getAgent`
  in `handleRefreshAgent`.) **Bonus (free here):** wire `TabBody`'s `onDelete` to
  `useDashboardStore.deleteAgent` instead of the current no-op — closes the logged bug
  "Deleting an agent from its detail tab is a no-op".
- **`SkillDetail`**: prop becomes `filePath: string` (was `skill: SkillFile`). Fetch
  `api.getSkill(filePath)` on mount/change; loading + not-found states.

## Lists (mostly type-only changes)

`PanelsArea`, `ConversationList`, `AddTabMenu`, `Console` keep their logic — only the store
slice type changes (`AgentFile`→`AgentSummary`, `SkillFile`→`SkillSummary`). Confirm each still
compiles (the fields they read all exist on the summaries); fix any incidental type usage.

## Data flow (after)

```
getAgentsMirror(path) ─┐                      onAgentsChanged ──► useDashboardStore.agents (AgentSummary[]) ──► lists
                       ├─ useDashboardStore.load        (live)
getSkillsMirror(path) ─┘                      onSkillsChanged ──► useDashboardStore.skills  (SkillSummary[]) ──► lists
TabBody opens agent/skill ──► AgentDetail.getAgent(id) / SkillDetail.getSkill(filePath) ──► full content (on-demand)
```

## Error handling / edge cases

- Snapshot for a non-active scope → ignored (match on `projectPath`).
- Detail fetch returns null (agent/skill deleted while open) → not-found state in the detail.
- `getDashboard` still drives `project`/`hooks`; if its agents/skills are now unused, leave the
  IPC as-is (no backend change) — the store just ignores those fields. (Trimming `getDashboard`
  is a later cleanup, out of scope.)
- Scope teardown on project switch / unmount: unwatch + unsubscribe to avoid leaks/cross-scope
  updates.

## Testing

- **`useDashboardStore`** (mock `window.api`): `load` populates `agents`/`skills` from the
  mirror getters; an `onAgentsChanged` push for the active scope updates `agents`; a push for a
  different `projectPath` is ignored; switching projects unwatches the old scope.
- **`AgentDetail`** / **`SkillDetail`**: fetch-by-id/path on mount (mock `getAgent`/`getSkill`),
  loading → loaded → not-found states.
- **`getSkill`** (backend, temp dir): reads one SKILL.md full incl. annex files; missing → null.
- Keep existing list/TabBody tests green (adjust to summary types + the new detail props).

## File layout

```
electron/services/project.service.ts        ← + getSkill(filePath) (factor single-dir skill read)
electron/ipc/projects.ipc.ts (or skills domain)? ← + skills:get   (confirm placement at impl)
electron/preload.ts + src/env.d.ts           ← + getSkill
src/store/useDashboardStore.ts               ← reshape to summaries + live watch/subscribe lifecycle
src/components/.../TabBody.tsx                ← pass agentId / filePath; wire onDelete to deleteAgent
src/components/AgentDetail/AgentDetail.tsx    ← prop agentId, fetch full on-demand
src/components/.../SkillDetail/SkillDetail.tsx← prop filePath, fetch full on-demand
src/types/dashboard.types (or mirror types)  ← AgentSummary/SkillSummary already in src/types barrels
```

Use the `AgentSummary`/`SkillSummary` types from the existing `src/types/agents-mirror.types`
/`src/types/skills-mirror.types` barrels.

## Out of scope (later)

- New UI surfaces for settings/memory/MCP (separate slices).
- Trimming `getDashboard` to stop computing agents/skills.
- Wiring the memory/MCP mirrors into any UI.
```
