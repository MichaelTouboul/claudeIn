# Header local-activity meter (from transcripts) — design

**Date:** 2026-06-02
**Status:** Approved (design) — pending implementation
**Scope:** Backend (new activity service from transcripts) + frontend (replace the consumption meter) + cleanup of the mis-aimed budget/$ meter.

## Context & motivation

The previously-built header `ConsumptionMeter` showed a **$ cost computed from local token
counts** against a user-set daily budget. The user clarified the real metric they care about
is the **plan usage panel** (Claude Code Settings → Usage: session % used, weekly per-model
limits, resets). Investigation established that this plan-usage data:
- has **no official Anthropic API** (Admin API covers only org/API-key billing, not
  subscription plans, and not individuals),
- has **no non-interactive CLI** (`/usage` is interactive-only; there is no `claude usage`),
- is only reachable via an **internal, undocumented endpoint** + the OAuth token — which is
  **against ToS, fragile, and not pursued**.

So the plan-usage panel is **not mirrorable by sanctioned means**. Decision: replace the
misleading `$` meter with an **honest local-activity view** computed from the real local
source of truth — the Claude Code **transcripts** — clearly labeled as local (this machine),
NOT plan usage.

## Decisions (locked)

- **Source = transcripts** (`~/.claude/projects/*/*.jsonl`) — fresh, complete (all sessions,
  not just ClaudeIn-spawned). NOT `stats-cache.json` (stale, ~3.5 months old, no longer
  refreshed) and NOT the app's SQLite events (ClaudeIn-only, incomplete).
- **Honest labeling:** the widget is "Local activity (this machine)" — it does not claim to
  be plan usage / limits.
- **Remove the mis-aimed pieces:** `useBudgetStore`, `ConsumptionMeter`, `ModelBreakdown`.
- **Keep:** `_ui/Progress` (reusable primitive, used for mini-bars), `formatTokens` (shared
  helper), and the `getCostsByModel` backend slice (tested, harmless, may serve the
  `CostDashboard` later — not wired to the header anymore).
- **No live watch in v1** — refetch on demand (the existing transcript watcher can drive it
  later).

## Backend — `electron/services/activity.service.ts`

```ts
interface ActivitySnapshot {
  today:  { messages: number; sessions: number; tokens: number };
  byModel: { model: string; tokens: number; messages: number }[]; // over the window
  byDay:   { date: string; messages: number; tokens: number }[];   // for a mini history
}
export function getActivity(days?: number): ActivitySnapshot; // default 7
```

- Scans `~/.claude/projects/*/*.jsonl`, **filtering files by `mtime`** within the window to
  bound cost, then aggregates per assistant/user message: counts, `model`, and token usage
  (`input_tokens + output_tokens`, optionally cache tokens) by day and by model. `sessions` =
  distinct transcript files with activity in the window; `today` = the calendar/rolling-day
  slice.
- Reuse `session.service.ts` transcript-parsing helpers where possible (it already reads
  these files and extracts `model`); do not duplicate JSON-line parsing if a helper exists.
- **In-memory cache with ~60 s TTL** (full parse is expensive — mirror `project.service`'s
  `cachedProjects`/TTL pattern). RAM only, never DB.
- Resolve `HOME` at call time (`process.env.HOME || os.homedir()`), like `session.service`.
- **Never throws:** missing dir → empty snapshot; a malformed transcript line/file → skipped.

IPC: `activity:get` → `getActivity(days?)`. Preload `getActivity`; `src/env.d.ts` signature;
`src/types/activity.types.ts` re-export barrel (as for the other mirrors). No new push channel
(no live watch in v1).

## Frontend — `ActivityMeter` (replaces `ConsumptionMeter`)

```
src/components/Header/ActivityMeter/ActivityMeter.tsx     ← compact header widget; fetches activity:get
src/components/Header/ActivityMeter/ActivityBreakdown.tsx ← popover content: 7-day mini-bars + per-model tokens
```

- Compact header display, e.g. `⚡ 1.2M today · 3 sessions` (use `formatTokens`). Click opens
  a `_ui/Popover` whose content (`ActivityBreakdown`) shows: a **7-day** mini-bar history
  (reuse `_ui/Progress` or simple bars) and a **per-model token** table (sorted desc), with a
  clear header **"Local activity · this machine"**.
- Fetches `window.api.getActivity(7)` on mount and refetches when the header's events-count
  signal (`refreshSignal`, already plumbed) changes; guards on its own loaded data
  (empty-state "No local activity yet" when the snapshot is empty).
- Design system only: CSS vars via `style={{}}`, no hardcoded Tailwind colors; a11y — the
  trigger is a `button` with an accessible name; bars carry appropriate aria.

## Cleanup (remove the mis-aimed meter)

- Delete `src/store/useBudgetStore.ts` (+ its test), `src/components/Header/ConsumptionMeter/`
  (`ConsumptionMeter.tsx`, `ModelBreakdown.tsx`, `utils.ts`, tests).
- `Header.tsx`: replace `<ConsumptionMeter … />` with `<ActivityMeter refreshSignal={…} />`.
  Drop the `fallbackCostToday`/budget wiring. Keep passing `refreshSignal`.
- Keep `src/components/_ui/Progress/`, `src/lib/formatTokens.ts`, and the `getCostsByModel`
  backend (costs.service/ipc/preload/env.d.ts/costs.types) untouched.
- Verify no dangling imports after removal (lint catches unused).

## Error handling / perf

- The `mtime` window filter + the 60 s TTL cache prevent re-parsing all of
  `~/.claude/projects` on every header refresh.
- Empty / missing transcripts → empty snapshot → widget shows "No local activity yet".
- Per-file parse failure → that file is skipped; never crashes the aggregate.

## Testing

- **`activity.service`** (temp dirs, `process.env.HOME` redirected): writes synthetic `.jsonl`
  transcripts (assistant messages with `model` + `usage`), asserts day/model aggregation,
  `today`/`sessions` counts, the `mtime` window filter (old files excluded), a corrupt
  line/file is skipped, and the TTL cache returns the same object within the window.
- **`ActivityMeter`** (mock `window.api.getActivity`): renders today's summary; popover shows
  per-model rows + day bars; empty-state when the snapshot is empty.

## File layout

```
electron/services/activity.service.ts (+ .test)   ← transcript aggregation + getActivity + cache
electron/types/activity.types.ts                  ← ActivitySnapshot
electron/ipc/activity.ipc.ts                       ← activity:get  (+ register in ipc/index.ts)
electron/preload.ts + src/env.d.ts                 ← getActivity
src/types/activity.types.ts                        ← renderer re-export barrel
src/components/Header/ActivityMeter/ActivityMeter.tsx (+ .test)
src/components/Header/ActivityMeter/ActivityBreakdown.tsx
src/components/Header/Header.tsx                   ← swap ConsumptionMeter → ActivityMeter
— removed: src/store/useBudgetStore.ts(+test), src/components/Header/ConsumptionMeter/*
```

Backend lint caveat (as before): ESLint ignores `electron/**`, typecheck is `src/`-scoped; the
real backend gate is `npx electron-vite build` + Vitest; uphold no-`any`/named-imports/300-line
by hand.

## Out of scope (later)

- Live watch/push for activity (refetch-on-demand for now).
- The real plan-usage panel (no sanctioned data path — parked).
- Persisting activity aggregates to SQLite.
- Renderer wiring of the settings/agents/skills mirrors (separate slice).
```
