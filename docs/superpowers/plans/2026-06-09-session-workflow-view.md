# Session Workflow View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Project note:** this repo's standard execution path is the lean dev-loop (`.claude/workflows/dev-loop.js`, invoked by `scriptPath`) — one run per phase, gate-verified, merged to `main`. Each Phase below is a self-contained dev-loop input.

**Goal:** Add a right-panel "session overview" surface that visualizes all agents of the open conversation live, with a Timeline / Tree / Board view switcher; clicking an agent opens its existing AgentTab.

**Architecture:** Renderer-only. A new `PanelTabKind.Workflow` tab in the existing tabbed UtilityPanel. A selector-based hook (`useSessionWorkflow`) derives per-agent `{status, tool, tokens, segments}` from `useEventsStore` (no new persisted state). A tiny `useWorkflowViewStore` holds the chosen view. Three view components render the same derived data; a segmented switcher toggles them.

**Tech Stack:** React (JSX transform, no `React` import), TypeScript (no `any`), zustand (selector-based), Vitest, design-system CSS custom properties. `@/` path alias. 300-line hard limit per file. Spec: `docs/superpowers/specs/2026-06-09-session-workflow-view-design.md`.

---

## File Structure

**Create:**
- `src/store/useWorkflowViewStore.ts` — view-kind state (`WorkflowViewKind` enum + `view`/`setView`).
- `src/store/useWorkflowViewStore.test.ts`
- `src/hooks/useSessionWorkflow.ts` — derives `WorkflowAgent[]` for a session from `useEventsStore`.
- `src/hooks/useSessionWorkflow.segments.ts` — pure helper: events → tool-span segments.
- `src/hooks/useSessionWorkflow.segments.test.ts`
- `src/hooks/useSessionWorkflow.test.ts`
- `src/components/Workspace/DashboardArea/Dashboard/UtilityPanel/WorkflowView/WorkflowView.tsx` — container + switcher host; reads `claudeSessionId` from payload.
- `src/components/.../WorkflowView/WorkflowViewSwitcher.tsx` — Timeline/Tree/Board segmented control.
- `src/components/.../WorkflowView/WorkflowBoard.tsx`
- `src/components/.../WorkflowView/WorkflowTree.tsx`
- `src/components/.../WorkflowView/WorkflowTimeline.tsx`
- `src/components/.../WorkflowView/agentPresentation.ts` — `AgentPresenceStatus` → `{dot, label, colorVar}` behavior map (shared by views).
- Test files alongside each view: `WorkflowView.test.tsx`, `WorkflowBoard.test.tsx`, `WorkflowTree.test.tsx`, `WorkflowTimeline.test.tsx`, `WorkflowViewSwitcher.test.tsx`.

**Modify:**
- `src/store/usePanelStore.ts` — add `Workflow` to `PanelTabKind`, `WorkflowPayload`, extend `PanelTab` / `PayloadByKind`.
- `src/components/Workspace/DashboardArea/Dashboard/UtilityPanel/panelTabBody.tsx` — render `WorkflowView` for the `Workflow` kind.
- `src/components/AgentChat/AgentChatInput/AgentTabs/AgentTabs.tsx` — add the "session overview" entry-point control.

**Read for context before starting (do not modify unless a task says so):**
- `src/store/useEventsStore.ts` — `presence`, `presenceSeq`, `events`, `AgentPresenceStatus`, the ingest reducer (to seed tests realistically).
- `src/store/usePanelStore.ts` — existing `Agent` tab wiring (`addTab`, the `updateTab` kind-guard) is the pattern to mirror.
- `src/components/.../UtilityPanel/AgentTab/AgentTab.tsx` — how an Agent tab reads live data + the open/focus flow to reuse on agent-click.
- `src/types/events.types.ts` — `LiveEvent` shape.
- `src/CLAUDE.md` — state-management decision tree, `_ui/` primitives, design-system vars.

---

## Phase 1 — Store plumbing (panel tab kind + view-kind store)

**Files:**
- Modify: `src/store/usePanelStore.ts`
- Create: `src/store/useWorkflowViewStore.ts`, `src/store/useWorkflowViewStore.test.ts`

### Task 1.1: `useWorkflowViewStore`

- [ ] **Step 1 — Write the failing test** (`src/store/useWorkflowViewStore.test.ts`)

```ts
import { beforeEach, describe, expect, it } from 'vitest';

import { useWorkflowViewStore, WorkflowViewKind } from './useWorkflowViewStore';

describe('useWorkflowViewStore', () => {
  beforeEach(() => useWorkflowViewStore.setState({ view: WorkflowViewKind.Timeline }));

  it('defaults to the Timeline view', () => {
    expect(useWorkflowViewStore.getState().view).toBe(WorkflowViewKind.Timeline);
  });

  it('switches the view via setView', () => {
    useWorkflowViewStore.getState().setView(WorkflowViewKind.Board);
    expect(useWorkflowViewStore.getState().view).toBe(WorkflowViewKind.Board);
  });
});
```

- [ ] **Step 2 — Run it, verify it fails**

Run: `npx vitest run src/store/useWorkflowViewStore.test.ts`
Expected: FAIL — cannot find module `./useWorkflowViewStore`.

- [ ] **Step 3 — Implement** (`src/store/useWorkflowViewStore.ts`)

```ts
import { create } from 'zustand';

/** The three ways to render a session's workflow. Add a value + a renderer entry to extend. */
export const WorkflowViewKind = { Timeline: 'timeline', Tree: 'tree', Board: 'board' } as const;
export type WorkflowViewKind = (typeof WorkflowViewKind)[keyof typeof WorkflowViewKind];

type WorkflowViewState = {
  view: WorkflowViewKind;
  setView: (view: WorkflowViewKind) => void;
};

export const useWorkflowViewStore = create<WorkflowViewState>((set) => ({
  view: WorkflowViewKind.Timeline,
  setView: (view) => set({ view }),
}));
```

- [ ] **Step 4 — Run it, verify it passes**

Run: `npx vitest run src/store/useWorkflowViewStore.test.ts` → PASS.

- [ ] **Step 5 — Commit**

```bash
git add src/store/useWorkflowViewStore.ts src/store/useWorkflowViewStore.test.ts
git commit -m "feat(workflow-view): add useWorkflowViewStore (view-kind state)"
```

### Task 1.2: `PanelTabKind.Workflow`

- [ ] **Step 1 — Write the failing test** (append to `src/store/usePanelStore.test.ts`)

```ts
it('opens a Workflow tab carrying the session id', () => {
  usePanelStore.setState({ tabs: [], activeId: null, isOpen: false });
  usePanelStore.getState().addTab({
    kind: PanelTabKind.Workflow,
    title: 'Session overview',
    payload: { claudeSessionId: 'sess-1' },
  });
  const tab = usePanelStore.getState().tabs.at(-1);
  expect(tab?.kind).toBe(PanelTabKind.Workflow);
  expect(tab?.kind === PanelTabKind.Workflow ? tab.payload.claudeSessionId : null).toBe('sess-1');
});
```

> Match `addTab`'s real signature while writing — read `usePanelStore.ts` first; the call above mirrors how an `Agent` tab is added.

- [ ] **Step 2 — Run it, verify it fails**

Run: `npx vitest run src/store/usePanelStore.test.ts`
Expected: FAIL — `Workflow` not on `PanelTabKind` / payload type error.

- [ ] **Step 3 — Implement** in `src/store/usePanelStore.ts`:

```ts
export const PanelTabKind = { Table: 'table', Code: 'code', Text: 'text', Agent: 'agent', Workflow: 'workflow' } as const;

/** A live session-overview view; like AgentPayload it carries no snapshot — the body reads useEventsStore. */
export type WorkflowPayload = { claudeSessionId: string | null };
```

Add to the `PanelTab` union and `PayloadByKind`:

```ts
  | { id: string; kind: typeof PanelTabKind.Workflow; title: string; payload: WorkflowPayload };
// PayloadByKind:
  [PanelTabKind.Workflow]: WorkflowPayload;
```

(No `TabPatch` entry needed — a Workflow tab is never patched with new content.)

- [ ] **Step 4 — Run it, verify it passes**

Run: `npx vitest run src/store/usePanelStore.test.ts` → PASS.

- [ ] **Step 5 — Gate + commit**

```bash
bash .claude/hooks/gate.sh
git add src/store/usePanelStore.ts src/store/usePanelStore.test.ts
git commit -m "feat(workflow-view): add PanelTabKind.Workflow + WorkflowPayload"
```

**Dev-loop input for Phase 1:** "Implement Phase 1 of the session-workflow-view plan (docs/superpowers/plans/2026-06-09-session-workflow-view.md): add `useWorkflowViewStore` (WorkflowViewKind enum, default Timeline, setView) and extend `usePanelStore` with `PanelTabKind.Workflow` + `WorkflowPayload`, wired into the PanelTab union and PayloadByKind exactly like the Agent kind. Strict TDD, follow CLAUDE.md + src/CLAUDE.md. Gate green via bash .claude/hooks/gate.sh. Commit per task."

---

## Phase 2 — Derivation (`useSessionWorkflow` + segment helper)

**Files:**
- Create: `src/hooks/useSessionWorkflow.segments.ts` (+ `.test.ts`), `src/hooks/useSessionWorkflow.ts` (+ `.test.ts`)
- Read: `src/store/useEventsStore.ts`, `src/types/events.types.ts`

**Shared types** (define in `useSessionWorkflow.ts`, import into the helper/tests):

```ts
import type { AgentPresenceStatus } from '@/store/useEventsStore';

export type WorkflowSegment = { tool: string | null; startMs: number; endMs: number };

export type WorkflowAgent = {
  agentName: string;
  status: AgentPresenceStatus;
  tool: string | null;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  segments: WorkflowSegment[];
  latestSeq: number;
};
```

### Task 2.1: Segment helper

- [ ] **Step 1 — Failing test** (`src/hooks/useSessionWorkflow.segments.test.ts`)

```ts
import { describe, expect, it } from 'vitest';

import { buildSegments } from './useSessionWorkflow.segments';
import type { LiveEvent } from '@/types/events.types';

const ev = (id: number, tool: string | null, at: string): LiveEvent => ({
  id, agent_name: 'coder', session_id: 's', event_type: 'tool', tool_name: tool,
  tokens_in: 0, tokens_out: 0, cost_usd: 0, created_at: at,
});

describe('buildSegments', () => {
  it('groups consecutive same-tool events into one span ordered by id', () => {
    const segs = buildSegments([
      ev(1, 'Read', '2026-06-09T10:00:00Z'),
      ev(2, 'Read', '2026-06-09T10:00:05Z'),
      ev(3, 'Edit', '2026-06-09T10:00:10Z'),
    ]);
    expect(segs.map((s) => s.tool)).toEqual(['Read', 'Edit']);
    expect(segs[0].startMs).toBeLessThan(segs[0].endMs);
  });

  it('returns one span for a single event and [] for none', () => {
    expect(buildSegments([ev(1, 'Read', '2026-06-09T10:00:00Z')])).toHaveLength(1);
    expect(buildSegments([])).toEqual([]);
  });
});
```

- [ ] **Step 2 — Run, verify fail.** Run: `npx vitest run src/hooks/useSessionWorkflow.segments.test.ts` → FAIL (module missing).

- [ ] **Step 3 — Implement** (`src/hooks/useSessionWorkflow.segments.ts`). Sort by `id`; open a new span when `tool_name` changes; `endMs` of a span = `created_at` of the next event (or its own for the last). Use `Date.parse(created_at)` for ms. Keep it pure, no store access.

- [ ] **Step 4 — Run, verify pass.**

- [ ] **Step 5 — Commit**

```bash
git add src/hooks/useSessionWorkflow.segments.ts src/hooks/useSessionWorkflow.segments.test.ts
git commit -m "feat(workflow-view): segment helper (events -> tool spans)"
```

### Task 2.2: `useSessionWorkflow`

- [ ] **Step 1 — Failing test** (`src/hooks/useSessionWorkflow.test.ts`). Seed `useEventsStore` (use its real `ingest` reducer so the test exercises true store behavior) with events for two sessions, then `renderHook(() => useSessionWorkflow('s1'))`:
  - returns only `s1`'s agents (an agent in `s2` never leaks in);
  - each agent's `status` matches `presence`, `tool` = latest event's `tool_name`, token totals summed;
  - re-renders with the new value after a newer event is ingested (selector reactivity);
  - `[]` when `claudeSessionId` is `null`.

Use `@testing-library/react`'s `renderHook` + `act` (match the import style already used in the repo's hook tests — check `useConversationAgents.test.ts`).

- [ ] **Step 2 — Run, verify fail.**

- [ ] **Step 3 — Implement** (`src/hooks/useSessionWorkflow.ts`). Selector-based: subscribe to `presence`, `presenceSeq`, and `events` from `useEventsStore`; for the given session build a `WorkflowAgent[]` (status from presence with `?? AgentPresenceStatus.Idle` for the absent case only; tool/tokens/segments derived from that session+agent's events via `buildSegments`). Sort agents by `latestSeq` descending. Return `[]` for a null session id. Keep under 300 lines — if it grows, push pure assembly into a sibling.

- [ ] **Step 4 — Run, verify pass.**

- [ ] **Step 5 — Gate + commit**

```bash
bash .claude/hooks/gate.sh
git add src/hooks/useSessionWorkflow.ts src/hooks/useSessionWorkflow.test.ts
git commit -m "feat(workflow-view): useSessionWorkflow derives per-agent run data"
```

**Dev-loop input for Phase 2:** "Implement Phase 2 of docs/superpowers/plans/2026-06-09-session-workflow-view.md: the pure `buildSegments` helper (events → tool-span segments, ordered by id) and the selector-based `useSessionWorkflow(claudeSessionId)` hook deriving WorkflowAgent[] from useEventsStore (presence/presenceSeq/events), strictly scoped to the session, reactive to newer events, [] for null. Seed tests via the store's real ingest reducer. Strict TDD; CLAUDE.md (no any, enum+behavior-map, 300-line limit); gate green."

---

## Phase 3 — Container, switcher, panel wiring, entry point

**Files:**
- Create: `WorkflowView/WorkflowView.tsx`, `WorkflowView/WorkflowViewSwitcher.tsx`, `WorkflowView/agentPresentation.ts` (+ tests)
- Modify: `panelTabBody.tsx`, `AgentTabs.tsx`

### Task 3.1: `agentPresentation` behavior map

- [ ] **Step 1 — Failing test:** asserts each `AgentPresenceStatus` maps to a `{ label, dot, colorVar }` and that the table has an entry for every status value (no fallback chain).
- [ ] **Step 2 — fail · Step 3 — implement** as `Record<AgentPresenceStatus, AgentPresentation>` using design-system CSS var names (e.g. `var(--status-active)`); `dot`/`label` per status. **Step 4 — pass · Step 5 — commit.**

### Task 3.2: `WorkflowViewSwitcher`

- [ ] **Step 1 — Failing test** (`WorkflowViewSwitcher.test.tsx`): renders three options; clicking "Board" calls `useWorkflowViewStore.setView(WorkflowViewKind.Board)`; the active option reflects store state. Use `@testing-library/react` + `userEvent`.
- [ ] **Step 2–4** — implement a segmented control (built on the `_ui/Tabs` primitive if it fits, else a small `role="tablist"` of buttons — see `src/CLAUDE.md` + the aria-requirements skill for accessible names/roles). Driven by `useWorkflowViewStore`. **Step 5 — commit.**

### Task 3.3: `WorkflowView` container

- [ ] **Step 1 — Failing test** (`WorkflowView.test.tsx`): given a seeded store + a `claudeSessionId` prop/payload, renders the switcher and, by default, the Timeline region (use a placeholder/`data-testid` until Phase 4 fills the views — assert the *active view region* is present, not full timeline rendering). Switching the store's `view` swaps the rendered region.
- [ ] **Step 2–4** — implement: reads `claudeSessionId` from `WorkflowPayload`, calls `useSessionWorkflow`, renders `WorkflowViewSwitcher` + the active view via a **`Record<WorkflowViewKind, ComponentType<WorkflowViewProps>>`** renderer map (no `switch`/ternary chain). Define `WorkflowViewProps = { agents: WorkflowAgent[]; onSelectAgent: (agentName: string) => void }`. For Phase 3, the three view components can be minimal stubs that list agent names; Phase 4 fleshes them out. **Step 5 — commit.**

### Task 3.4: Panel body wiring

- [ ] **Step 1 — Failing test:** rendering the panel body for a `Workflow` tab shows the `WorkflowView` (extend `UtilityPanel.test.tsx` / `panelTabBody` test).
- [ ] **Step 2–4** — add the `Workflow` case to `panelTabBody.tsx`, passing `payload.claudeSessionId`. The `onSelectAgent` handler calls the existing add/focus-Agent-tab flow (`addTab` with `PanelTabKind.Agent`, `{ agentName, claudeSessionId }`) — reuse exactly what `AgentTab`/`OpenInPanelButton` already do. **Step 5 — commit.**

### Task 3.5: Entry point in `AgentTabs`

- [ ] **Step 1 — Failing test** (extend `AgentTabs.test.tsx`): an "session overview" control is rendered; clicking it calls `usePanelStore.addTab` with a `Workflow` tab for the current `claudeSessionId` (open-or-focus). Give it an accessible name (e.g. `aria-label="Open session overview"`).
- [ ] **Step 2–4** — add one minimal control (a ⊞ icon button) at the edge of the presence-tabs row. **Step 5 — Gate + commit.**

```bash
bash .claude/hooks/gate.sh
```

**Dev-loop input for Phase 3:** "Implement Phase 3 of docs/superpowers/plans/2026-06-09-session-workflow-view.md: `agentPresentation` Record behavior-map (status→{label,dot,colorVar}); `WorkflowViewSwitcher` (segmented control driven by useWorkflowViewStore, accessible roles/names); `WorkflowView` container (reads WorkflowPayload.claudeSessionId, useSessionWorkflow, renders switcher + active view via a Record<WorkflowViewKind, Component> map — no ternary chains; views are minimal agent-name stubs for now); wire `Workflow` kind into panelTabBody (onSelectAgent → open/focus existing Agent tab); add a minimal accessible 'session overview' entry-point control to AgentTabs that opens the Workflow tab. Strict TDD; CLAUDE.md + src/CLAUDE.md + aria-requirements; design-system CSS vars; 300-line limit; gate green."

---

## Phase 4 — The three views

**Files:** flesh out `WorkflowBoard.tsx`, `WorkflowTree.tsx`, `WorkflowTimeline.tsx` (+ tests). All consume `WorkflowViewProps` (`agents`, `onSelectAgent`) and `agentPresentation`.

### Task 4.1: `WorkflowBoard` (simplest first)

- [ ] **Step 1 — Failing test:** given seeded agents across statuses, renders three groups (Working / Waiting / Idle) with the right agents under each; each card shows tool + token total; clicking a card calls `onSelectAgent(agentName)`.
- [ ] **Step 2–4** — implement: group agents by `status` (drive group order/labels from a `Record`), render cards using `agentPresentation`. **Step 5 — commit.**

### Task 4.2: `WorkflowTree`

- [ ] **Step 1 — Failing test:** renders one session-root node and one child node per agent (depth-1 fan); each node shows the status dot + current tool; clicking a node calls `onSelectAgent`.
- [ ] **Step 2–4** — implement the depth-1 fan (no parent inference — flat data). Use CSS for the connector lines; design-system vars for color. **Step 5 — commit.**

### Task 4.3: `WorkflowTimeline`

- [ ] **Step 1 — Failing test:** renders one lane per agent; an agent with two segments renders two segment elements; a `waiting` agent shows the waiting marker; clicking a lane calls `onSelectAgent`. (Assert structure/counts, not pixel widths.)
- [ ] **Step 2–4** — implement swimlanes: lane per agent, segments positioned/sized from `WorkflowSegment.startMs/endMs` normalized across the run's min→max time, colored by tool via `agentPresentation`/a tool-color map, plus a "now" marker. Keep each file < 300 lines; extract a `segmentGeometry.ts` pure helper (+ test) if normalization math pushes the limit. **Step 5 — Gate + commit.**

```bash
bash .claude/hooks/gate.sh
```

**Dev-loop input for Phase 4:** "Implement Phase 4 of docs/superpowers/plans/2026-06-09-session-workflow-view.md: flesh out the three views consuming WorkflowViewProps + agentPresentation — `WorkflowBoard` (cards grouped Working/Waiting/Idle, tool+tokens, click→onSelectAgent), `WorkflowTree` (depth-1 fan from a session root, status dot+tool per node, click→onSelectAgent), `WorkflowTimeline` (swimlane per agent, segments sized from segment startMs/endMs normalized across the run, tool colors, now marker, click→onSelectAgent). Assert structure/counts in tests, not pixels. Extract a pure segmentGeometry helper (+test) if needed for the 300-line limit. Strict TDD; CLAUDE.md + src/CLAUDE.md + aria-requirements; design-system CSS vars; gate green."

---

## Self-Review

**Spec coverage:**
- Right-panel session overview → Phase 1 (`PanelTabKind.Workflow`) + Phase 3.4 wiring. ✓
- Bound to open conversation's `claudeSessionId` → `WorkflowPayload` + `WorkflowView` reads it. ✓
- Live data from `useEventsStore` (presence/presenceSeq/events) → `useSessionWorkflow` (Phase 2). ✓
- Three views + switcher, default Timeline → `useWorkflowViewStore` (1.1), switcher (3.2), views (Phase 4). ✓
- Click agent → open/focus existing AgentTab → 3.4 `onSelectAgent`. ✓
- Entry point on AgentTabs row → 3.5. ✓
- Enum + behavior-map, no fallback chain → `WorkflowViewKind`, `agentPresentation`, renderer map (3.3); `?? Idle` only for the absent case (2.2). ✓
- Timeline = recent in-memory window → `buildSegments` over the `events` buffer (2.1). ✓
- Out of scope (historical replay, World B, real parent inference) → not planned. ✓

**Placeholder scan:** Phase 1–2 carry full code; Phases 3–4 describe components behaviorally with exact props/contracts/file paths and the precise dev-loop input, rather than speculative full JSX (the repo's exact `_ui`/test idioms are read at execution time). No "TBD"/"handle edge cases"/unnamed types — all types (`WorkflowAgent`, `WorkflowSegment`, `WorkflowViewProps`, `WorkflowPayload`, `WorkflowViewKind`, `AgentPresentation`) are defined where introduced.

**Type consistency:** `WorkflowViewKind`, `WorkflowAgent`, `WorkflowSegment`, `WorkflowViewProps`, `onSelectAgent`, `buildSegments`, `useSessionWorkflow`, `PanelTabKind.Workflow`, `WorkflowPayload` are used identically across phases.
