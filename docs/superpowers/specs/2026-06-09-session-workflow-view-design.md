# Session Workflow View — Design

**Date:** 2026-06-09
**Status:** Approved (brainstorm) → ready for implementation plan
**Scope:** Renderer-only. No backend / IPC changes.

## What this is

A **"session overview" surface** in the right panel (UtilityPanel) that visualizes **all the agents of the currently-open conversation** working in the background, live. The user can switch between **three views** of the same run — **Timeline**, **Tree**, **Board** — via a segmented control. Clicking an agent in any view opens (or focuses) that agent's existing `AgentTab`.

The job it serves (primary): **understand the shape of a run** — which agents are working, on what tool, who is waiting, and in what order things unfold. Secondary jobs it also helps with: awareness (something needs me / something finished), navigation (jump to the active agent), and health/cost (spot a stuck or expensive agent).

This is **World A only**: sessions ClaudeIn spawns itself (`claude --print`), whose live activity is already captured in `useEventsStore`. Visualizing CLI-run dev-loops (worktrees, subagent trees, `loop/*` branches) is **deferred** — see *Out of scope*.

## Why now

Phases 1–2 of agent-tabs shipped (presence chips on the chat input → clicking a chip opens a single agent's `AgentTab` in the right panel). The `OrchestratorTree` (a flat live agent list) was removed from the left sidebar. What's missing is a **level up from a single agent**: a coherent view of the *whole* multi-agent run of a session, with the temporal/structural shape that a single tab can't show.

## Data source (live, already present)

All from `useEventsStore`, scoped by the conversation's session id. Nothing new is persisted; the only new state is the user's chosen view.

- `presence: Map<sessionId, Map<agentName, AgentPresenceStatus>>` — per-agent status (`active` / `waiting` / `idle`).
- `presenceSeq: Map<sessionId, Map<agentName, number>>` — monotonic high-water seq per agent (already maintained for the dismiss feature).
- `events: LiveEvent[]` (rolling in-memory buffer) — per-agent `tool_name`, `tokens_in/out`, `cost_usd`, `created_at`, monotonic `id`. Used to derive the current tool, token totals, and **timeline segments** (a recent in-memory window — full historical reconstruction is v2).

The view is bound to the **currently-open conversation's `claudeSessionId`** (same scoping key the existing `AgentTab` uses).

### Note on the Timeline data

The Timeline needs per-agent *activity segments over time*. These are **derived** from the in-memory `events` buffer by grouping each agent's consecutive events into tool-spans ordered by `created_at`/`id`. Because the buffer is a rolling window, the Timeline shows the **recent** window of the run, not its full history. This is acceptable for the live-first goal; scrubbable full-history replay is **v2**.

## Architecture

Integrates as a **new panel tab kind** in the existing tabbed right panel (`usePanelStore` / UtilityPanel). The store's own comment documents the extension contract: *"Add a value here + an entry in TAB_BODY to extend the panel."*

### Store change — `src/store/usePanelStore.ts`

- Add `Workflow: 'workflow'` to `PanelTabKind`.
- Add `WorkflowPayload = { claudeSessionId: string | null }`.
- Extend the `PanelTab` discriminated union, `PayloadByKind`, and `TabPatch` with the new kind (mirror how `Agent` is wired).

A Workflow tab carries no snapshot content — like the Agent tab, its body reads live from `useEventsStore`.

### View-kind state — `src/store/useWorkflowViewStore.ts` (new)

Small selector-based zustand store holding the chosen view, persisted across mounts.

```ts
export const WorkflowViewKind = { Timeline: 'timeline', Tree: 'tree', Board: 'board' } as const;
export type WorkflowViewKind = (typeof WorkflowViewKind)[keyof typeof WorkflowViewKind];
```

State: `{ view: WorkflowViewKind; setView: (v: WorkflowViewKind) => void }`. Default `Timeline`.

### Derivation hook — `src/hooks/useSessionWorkflow.ts` (new)

`useSessionWorkflow(claudeSessionId: string | null)` → a selector-based hook deriving, for that session, an array of:

```ts
type WorkflowAgent = {
  agentName: string;
  status: AgentPresenceStatus;   // from presence
  tool: string | null;           // latest tool_name from events
  tokensIn: number; tokensOut: number; costUsd: number;
  segments: WorkflowSegment[];   // derived tool-spans for the Timeline
  latestSeq: number;             // from presenceSeq, for ordering/keys
};
```

`WorkflowSegment = { tool: string | null; startMs: number; endMs: number }`. Pure derivation from store selectors — no new persisted state. Segment-grouping lives in a sibling pure helper (e.g. `useSessionWorkflow.segments.ts`) to respect the 300-line limit and keep the hook testable.

### Components — `src/components/Workspace/DashboardArea/Dashboard/UtilityPanel/WorkflowView/`

- `WorkflowView.tsx` — container: header with the **view switcher** (segmented control, built on the `_ui/Tabs` primitive or a small segmented control), renders the active view. Reads `claudeSessionId` from its `WorkflowPayload`.
- `WorkflowViewSwitcher.tsx` — the Timeline/Tree/Board segmented control, driven by `useWorkflowViewStore`.
- `WorkflowTimeline.tsx` — swimlanes: one lane per agent, segments colored by tool, a "now" marker, a `waiting` glyph.
- `WorkflowTree.tsx` — session root → agents fan (depth-1; data is flat, no parent links). Status dot + current tool per node.
- `WorkflowBoard.tsx` — cards grouped by status (Working / Waiting / Idle), each showing tool + tokens.
- shared bits (e.g. `AgentNode.tsx`, status→presentation map) as siblings if size demands.

Wire `WorkflowView` into the panel body map (`panelTabBody.tsx` / `UtilityPanel`) under the `Workflow` kind.

### Entry point

The presence-tabs row (`AgentTabs`) gets a minimal **"session overview"** control (e.g. a small ⊞ glyph at the row's edge) that calls `usePanelStore.addTab` with a `Workflow` tab for the current `claudeSessionId` (open-or-focus, same pattern as opening an Agent tab). Keep it to one affordance — no new chrome.

### Interaction

- Clicking an agent in **any** view calls the existing add/focus-Agent-tab flow (`PanelTabKind.Agent`, `AgentPayload = { agentName, claudeSessionId }`), reusing what agent-tabs Phase 2 already built.
- The chosen view persists via `useWorkflowViewStore` (survives closing/reopening the tab).

## State modeling (CLAUDE.md compliance)

- `WorkflowViewKind` and `PanelTabKind.Workflow` are `as const` enums.
- View kind → rendered component, and `AgentPresenceStatus` → {color, dot, label}, are expressed as **`Record<…>` behavior maps**, not fallback chains. A `?? Idle` default is used **only** for the genuinely absent/unknown agent case.
- No `any`; named imports; `import type` for type-only; `@/` alias; 300-line hard limit (split per view); design-system CSS custom properties for all color/spacing; explicit ternaries.

## Testing (strict TDD)

- `useSessionWorkflow` — derives the right agent list, statuses, latest tool, and token totals from a seeded `useEventsStore`; updates when a newer event arrives (selector reactivity); scopes strictly to the given `claudeSessionId` (an agent in another session never leaks in).
- Segment helper — groups consecutive same-tool events into spans; orders by seq/time; handles a single event and an empty stream.
- `useWorkflowViewStore` — default is `Timeline`; `setView` switches; selector-based.
- `usePanelStore` — adding/focusing a `Workflow` tab; the kind-guard in `updateTab` still rejects a mismatched payload.
- Each view component — renders the seeded agents; clicking an agent invokes the add/focus-Agent-tab action; the switcher changes which view renders.

The quality gate (`bash .claude/hooks/gate.sh`: lint 0/0, typecheck, build, tests) is the bar.

## Out of scope (v2 / later)

- **Historical scrubbable replay** of a finished run (reconstruct from persisted SQLite events ordered by seq/created_at). Live-first only here.
- **World B** — visualizing CLI-run dev-loops: git worktrees under `.claude/worktrees/loop-*`, the orchestrator→subagent tree, `loop/*` branch/merge status. Needs new file/git-watching backend; its own feature.
- **Real parent→child inference** in the Tree (true orchestration hierarchy). For now the Tree is a depth-1 fan from the session root.

## Suggested build sequence

1. Store plumbing — `PanelTabKind.Workflow` + payload in `usePanelStore`; `useWorkflowViewStore`. (TDD)
2. Derivation — `useSessionWorkflow` + segment helper. (TDD)
3. Container + switcher — `WorkflowView` + `WorkflowViewSwitcher`, wired into the panel body and the `AgentTabs` entry point; default Timeline view renders.
4. The three views — `WorkflowBoard` (simplest) → `WorkflowTree` → `WorkflowTimeline`, each with agent-click → open Agent tab.

Each step is gate-verified and committed independently.
