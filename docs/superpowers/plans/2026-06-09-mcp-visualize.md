# MCP Visualize (MCP-1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Project note:** standard execution path is the lean dev-loop (`.claude/workflows/dev-loop.js`, invoked by `scriptPath`) — one run per phase, gate-verified, merged to `main`. Each Phase below is a self-contained dev-loop input.

**Goal:** Surface the configured MCP servers in a read-only "MCP Servers" internal tab, wiring the existing MCP mirror into the UI exactly like agents/skills.

**Architecture:** Renderer-only, zero backend. `useDashboardStore` gains an `mcp` slice fed by the existing `getMcp`/`watchMcp`/`onMcpChanged` IPC (same scope-switch wiring as agents/skills). A new `InternalTab` `kind:'mcp'` routes in `TabBody` to an `McpView` that renders a flat list of reconciled servers (transport + provenance badges, target, dimmed `shadowed` rows). A sidebar affordance opens/focuses the tab.

**Tech Stack:** React (JSX transform, no `React` import), TypeScript (no `any`), zustand (selector-based), Vitest + @testing-library/react. `@/` alias. 300-line hard limit. Design-system CSS custom properties. Spec: `docs/superpowers/specs/2026-06-09-mcp-visualize-design.md`.

---

## File Structure

**Create:**
- `src/components/Workspace/DashboardArea/Dashboard/McpView/mcpPresentation.ts` — `Record<McpTransport, …>` + `Record<McpSource, …>` behavior maps.
- `src/components/.../McpView/McpServerBadges.tsx` — transport + source badges.
- `src/components/.../McpView/McpServerRow.tsx` — one server row (name, badges, target, shadowed dimming).
- `src/components/.../McpView/McpView.tsx` — `{ servers: McpServerEntry[] }` list + empty state.
- Test files alongside each: `mcpPresentation.test.ts`, `McpServerBadges.test.tsx`, `McpServerRow.test.tsx`, `McpView.test.tsx`.

**Modify:**
- `src/store/useDashboardStore.ts` — add `mcp: McpServerEntry[]` + fetch/watch/onChanged/teardown wiring.
- `src/store/useWorkspaceStore.ts` — add `'mcp'` to `InternalTab` kind + open-or-focus identity.
- `src/components/Workspace/DashboardArea/Dashboard/DashboardSurface/TabBody.tsx` — route `kind:'mcp'`.
- A sidebar component (where agents/skills tabs are opened from) — add the MCP entry point. **Locate it at execution time** (grep for where an `agent`/`skill` `InternalTab` is opened, e.g. `AgentList` / `PanelsArea`).

**Read for context before starting (do not modify unless a task says so):**
- `src/store/useDashboardStore.ts` — the agents/skills wiring (`getAgentsMirror` + `watchAgents` + `onAgentsChanged`, the `unsubscribeAgents` handle, the teardown helper, the `activeScopePath` scoping guard) is the exact pattern to copy.
- `src/store/useWorkspaceStore.ts` — the `InternalTab` union + the focus-existing-tab helper.
- `src/components/.../DashboardSurface/TabBody.tsx` — the kind→component routing.
- `src/types/mcp-mirror.types.ts` — `McpSnapshot`, `McpServerEntry`, `McpSource`, `McpScope`, `McpTransport`.
- `src/env.d.ts` — the `getMcp` / `watchMcp` / `unwatchMcp` / `onMcpChanged` signatures.

---

## Phase 1 — Store wiring (`useDashboardStore.mcp`)

**Files:** Modify `src/store/useDashboardStore.ts` + its test `src/store/useDashboardStore.test.ts`.

### Task 1.1: `mcp` slice fed + scoped + torn down

- [ ] **Step 1 — Write failing tests** (extend `useDashboardStore.test.ts`), mirroring the existing agents/skills wiring tests:
  - after loading a project scope, `mcp` is seeded from `window.api.getMcp`;
  - an `onMcpChanged` snapshot whose `projectPath === activeScopePath` updates `mcp`;
  - an `onMcpChanged` snapshot for a **different** `projectPath` is ignored;
  - tearing down / switching scope calls `window.api.unwatchMcp`.

Use the same `window.api` test double the agents/skills tests use (read the existing test to match seams — e.g. a mocked `window.api` with `getMcp`/`watchMcp`/`unwatchMcp`/`onMcpChanged` returning an unsubscribe fn).

- [ ] **Step 2 — Run, verify fail.** Run: `npx vitest run src/store/useDashboardStore.test.ts` → FAIL (`mcp` undefined / `getMcp` not called).

- [ ] **Step 3 — Implement** in `useDashboardStore.ts`:
  - import `type { McpServerEntry } from '@/types/mcp-mirror.types'`;
  - add `mcp: McpServerEntry[]` to the state type + `mcp: []` to the initial state;
  - add a module-level `let unsubscribeMcp: (() => void) | null = null;` beside `unsubscribeAgents`;
  - in the scope-load action, add `window.api.getMcp(watchPath)` to the parallel fetch (`Promise.all`), seed `mcp: mcpSnap.servers` in the `set`, then:
    ```ts
    unsubscribeMcp = window.api.onMcpChanged((snapshot) => {
      if (snapshot.projectPath === activeScopePath) set({ mcp: snapshot.servers });
    });
    void window.api.watchMcp(watchPath);
    ```
  - in the teardown helper, add `void window.api.unwatchMcp();` and `unsubscribeMcp?.(); unsubscribeMcp = null;`.

- [ ] **Step 4 — Run, verify pass.** Run: `npx vitest run src/store/useDashboardStore.test.ts` → PASS.

- [ ] **Step 5 — Gate + commit**

```bash
bash .claude/hooks/gate.sh
git add src/store/useDashboardStore.ts src/store/useDashboardStore.test.ts
git commit -m "feat(mcp): wire mcp servers slice into useDashboardStore (scoped, live)"
```

**Dev-loop input for Phase 1:** "Implement Phase 1 of docs/superpowers/plans/2026-06-09-mcp-visualize.md: add an `mcp: McpServerEntry[]` slice to src/store/useDashboardStore.ts, fed/scoped/torn-down by COPYING the existing agents/skills wiring exactly (getMcp in the parallel fetch; onMcpChanged guarded by activeScopePath; watchMcp; unwatchMcp + unsubscribe in teardown). Read useDashboardStore.ts + its test first and mirror the same window.api test seams. Tests: mcp seeded on scope load; active-scope onMcpChanged updates it; other-projectPath snapshot ignored; unwatchMcp on teardown. Strict TDD; CLAUDE.md (no any, named imports, import type, selector-based zustand); gate green."

---

## Phase 2 — Tab plumbing (`kind:'mcp'` + routing)

**Files:** Modify `src/store/useWorkspaceStore.ts` (+test), `src/components/Workspace/DashboardArea/Dashboard/DashboardSurface/TabBody.tsx` (+ its test if present).

### Task 2.1: `'mcp'` tab kind + open-or-focus

- [ ] **Step 1 — Failing test** (extend `useWorkspaceStore.test.ts`): opening an `{ kind:'mcp', title:'MCP Servers' }` tab adds it; opening a second one **focuses the existing** tab instead of duplicating (identity by kind, since there is one MCP tab per project).

- [ ] **Step 2 — Run, verify fail.**

- [ ] **Step 3 — Implement** in `useWorkspaceStore.ts`:
  - extend the `InternalTab` `kind` union with `'mcp'` (`'chat' | 'agent' | 'skill' | 'session' | 'mcp'`);
  - in the focus-existing helper, add: `if (tab.kind === 'mcp') return tabs.find((t) => t.kind === 'mcp');`.

- [ ] **Step 4 — Run, verify pass.**

- [ ] **Step 5 — Commit**

```bash
git add src/store/useWorkspaceStore.ts src/store/useWorkspaceStore.test.ts
git commit -m "feat(mcp): add 'mcp' internal tab kind (open-or-focus by kind)"
```

### Task 2.2: Route the tab to `McpView`

- [ ] **Step 1 — Failing test** (extend the TabBody test, or create one matching the repo's approach): a `kind:'mcp'` tab renders `McpView` fed from `useDashboardStore((s) => s.mcp)`.

> A minimal placeholder `McpView` may be created here to make routing testable; Phase 3 fleshes it out. If so, keep the placeholder a real component (`{ servers }` prop) so Phase 3 only adds rendering, not a rename.

- [ ] **Step 2 — Run, verify fail.**

- [ ] **Step 3 — Implement** in `TabBody.tsx`: `const mcp = useDashboardStore((s) => s.mcp);` and `if (tab.kind === 'mcp') return <McpView servers={mcp} />;` (before the trailing skill branch).

- [ ] **Step 4 — Run, verify pass.**

- [ ] **Step 5 — Gate + commit**

```bash
bash .claude/hooks/gate.sh
git add src/components/Workspace/DashboardArea/Dashboard/DashboardSurface/TabBody.tsx src/components/Workspace/DashboardArea/Dashboard/McpView/
git commit -m "feat(mcp): route 'mcp' tab to McpView in TabBody"
```

**Dev-loop input for Phase 2:** "Implement Phase 2 of docs/superpowers/plans/2026-06-09-mcp-visualize.md: add `'mcp'` to the InternalTab kind union in src/store/useWorkspaceStore.ts with open-or-focus identity by kind (one MCP tab per project); route `kind:'mcp'` in TabBody.tsx to `<McpView servers={useDashboardStore(s=>s.mcp)} />` (a minimal real {servers} placeholder McpView is fine — Phase 3 fleshes it). Tests: second mcp tab focuses the existing; TabBody renders McpView for the mcp kind. Strict TDD; CLAUDE.md; gate green."

---

## Phase 3 — The view (presentation maps → badges → row → list)

**Files:** Create under `src/components/Workspace/DashboardArea/Dashboard/McpView/`: `mcpPresentation.ts`, `McpServerBadges.tsx`, `McpServerRow.tsx`, `McpView.tsx` (+ tests). Reuse types from `@/types/mcp-mirror.types`.

### Task 3.1: `mcpPresentation` behavior maps

- [ ] **Step 1 — Failing test** (`mcpPresentation.test.ts`): every `McpTransport` value (`stdio`, `http`, `sse`, `unknown`) has a `Record` entry with a `label`; every `McpSource` value has an entry with a `label`. (No missing-key fallback — `unknown` is an explicit entry.)
- [ ] **Step 2 — fail · Step 3 — implement** two `Record<…>` maps (`TRANSPORT_PRESENTATION`, `SOURCE_PRESENTATION`) with `label` (+ optional `colorVar` using design-system vars). **Step 4 — pass · Step 5 — commit.**

### Task 3.2: `McpServerBadges`

- [ ] **Step 1 — Failing test:** given a `McpServerEntry`, renders the transport label and the source label from the maps.
- [ ] **Step 2–4** — implement a small presentational component reading the maps. **Step 5 — commit.**

### Task 3.3: `McpServerRow`

- [ ] **Step 1 — Failing test:** renders the server `name`, the badges, and `target` (monospace); a `shadowed` server gets the dimmed treatment + a "shadowed" tag (assert the tag text / a class or `data-` marker, not pixel styles).
- [ ] **Step 2–4** — implement. **Step 5 — commit.**

### Task 3.4: `McpView`

- [ ] **Step 1 — Failing test:** given two servers renders two `McpServerRow`s; given `[]` renders the empty state ("No MCP servers configured" — assert the text).
- [ ] **Step 2–4** — implement the list + empty state (replacing the Phase 2 placeholder body). **Step 5 — Gate + commit.**

```bash
bash .claude/hooks/gate.sh
```

**Dev-loop input for Phase 3:** "Implement Phase 3 of docs/superpowers/plans/2026-06-09-mcp-visualize.md under src/components/Workspace/DashboardArea/Dashboard/McpView/: `mcpPresentation.ts` (Record<McpTransport,…> + Record<McpSource,…> behavior maps, an explicit `unknown` transport entry, design-system colorVars — no fallback chain); `McpServerBadges` (transport + source labels from the maps); `McpServerRow` (name, badges, target monospace, shadowed → dimmed + 'shadowed' tag); `McpView` ({servers}: list of rows + 'No MCP servers configured' empty state, replacing any Phase-2 placeholder body). Types from @/types/mcp-mirror.types. Tests: every transport+source has a map entry; badges render labels; shadowed row tagged+dimmed; McpView renders one row per server and the empty state for []. Strict TDD; CLAUDE.md + src/CLAUDE.md + aria-requirements; design-system CSS vars; 300-line limit; gate green."

---

## Phase 4 — Entry point (sidebar opens the MCP tab)

**Files:** Modify the sidebar component that opens agent/skill tabs (locate via grep at execution time) + its test.

### Task 4.1: Sidebar MCP affordance

- [ ] **Step 1 — Failing test:** the sidebar renders an MCP entry with an accessible name (e.g. `aria-label="MCP servers"` or visible text "MCP Servers"); activating it calls the open-or-focus tab action with `{ kind:'mcp', title:'MCP Servers' }`.

> First grep for where an `agent`/`skill` `InternalTab` gets opened (the action name + the component). Mirror that callsite — same action, new kind. Place the affordance consistently with how skills/agents are launched (a nav item/button, not a per-item list).

- [ ] **Step 2 — Run, verify fail.**

- [ ] **Step 3 — Implement** the single affordance calling the same open-or-focus action used for agent/skill tabs, with the `mcp` tab descriptor.

- [ ] **Step 4 — Run, verify pass.**

- [ ] **Step 5 — Gate + commit**

```bash
bash .claude/hooks/gate.sh
git add -A
git commit -m "feat(mcp): sidebar entry point opens the MCP Servers tab"
```

**Dev-loop input for Phase 4:** "Implement Phase 4 of docs/superpowers/plans/2026-06-09-mcp-visualize.md: add one accessible sidebar affordance that opens/focuses the MCP tab ({kind:'mcp', title:'MCP Servers'}) via the SAME open-or-focus action used for agent/skill tabs. Grep first for where an agent/skill InternalTab is opened and mirror that callsite/placement. Test: the entry renders with an accessible name and activating it calls the open-or-focus action with the mcp tab descriptor. Strict TDD; CLAUDE.md + src/CLAUDE.md + aria-requirements; gate green."

---

## Self-Review

**Spec coverage:**
- Read-only list of reconciled servers → Phase 3 (`McpView`/`McpServerRow`). ✓
- Wired via existing mirror, zero backend → Phase 1 (`useDashboardStore` mcp slice using getMcp/watchMcp/onMcpChanged/unwatchMcp). ✓
- Live updates, scoped to active project → Phase 1 (`activeScopePath` guard). ✓
- Internal `kind:'mcp'` tab, open-or-focus by kind → Phase 2. ✓
- Routed in `TabBody` → Phase 2.2. ✓
- Transport + provenance badges, target, dimmed shadowed → Phase 3.1–3.3. ✓
- Empty state → Phase 3.4. ✓
- Sidebar entry point → Phase 4. ✓
- Enum + behavior maps, no fallback chains; `unknown` explicit → Phase 3.1. ✓
- Out of scope (edit/raw/live-status/tools) → not planned. ✓

**Placeholder scan:** Phase 1–2 carry concrete code/signatures; Phases 3–4 describe components behaviorally with exact paths, props, assertions, and dev-loop inputs (the repo's exact `_ui`/sidebar idioms are read at execution time). No "TBD"/"handle edge cases"/unnamed types — all types come from `@/types/mcp-mirror.types`.

**Type consistency:** `McpServerEntry`, `McpSnapshot`, `McpSource`, `McpTransport`, `mcp` slice name, `getMcp`/`watchMcp`/`unwatchMcp`/`onMcpChanged`, `kind:'mcp'`, `McpView servers` prop, `mcpPresentation` maps are used identically across phases.
