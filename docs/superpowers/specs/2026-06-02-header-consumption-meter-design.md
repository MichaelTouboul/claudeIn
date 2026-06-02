# Header consumption meter — design

**Date:** 2026-06-02
**Status:** Approved (design) — pending implementation
**Scope:** Frontend (renderer) only. Consumes the already-merged `getCostsByModel` IPC. No backend changes.

## Context & motivation

The header's `StatsBar` already shows today's cost as a plain `$X.XX`. This slice turns daily
consumption into a **progress bar against a user-set daily budget**, clickable to reveal a
**per-model breakdown** for today — the first consumer of the just-merged `getCostsByModel`
slice, and the app's first own (non-`~/.claude`) user preference.

## Decisions (locked)

- **Progress bar denominator:** a user-set **daily budget** (`$/day`). Bar = `cost_today / dailyBudget`, colored by threshold.
- **Budget storage:** renderer-only, **zustand + `persist` middleware** (localStorage). No backend.
- **Slice scope:** the **consumption widget only** — it replaces the `$` cost item in `StatsBar`. Other header items (active sessions, current model, notif bell) are out of scope.
- **Dropdown period:** **today only** (`getCostsByModel(1)`), consistent with the daily bar.
- **Default budget:** `$10/day`.
- The bar **replaces** the StatsBar `$` item (not added alongside).
- `formatTokens` is extracted from `StatsBar` into a shared helper (small refactor in-passing).

## Behavior

```
┌ header ────────────────────────────────────────────────┐
│ … Live ● 3  ⚡128K   ▓▓▓▓▓▓▓░░░ $4.20/$10   [💬 Chat]    │
└─────────────────────────────────────────────────────────┘
        click the bar ↓
   ┌ Today ─────────────────────┐
   │ claude-opus-4-7   $3.10  82K│
   │ claude-sonnet-4-6 $1.05  41K│
   │ <synthetic>       $0.05   2K│
   ├────────────────────────────┤
   │ Daily budget:  $ [  10  ]   │
   └────────────────────────────┘
```

- Progress bar fill = `min(cost_today / dailyBudget, 1)`; color by threshold: `<70%` →
  `--color-active` (green), `70–90%` → yellow, `>90%` → `--color-danger`.
- Label: `$<cost_today>/$<budget>`.
- Click opens a `_ui/Popover` with: per-model rows (model · `$cost` · tokens, sorted by cost
  desc) for today, then a "Daily budget" numeric input bound to the store.

## Data

- Single source: `window.api.getCostsByModel(1)` → today's rows
  (`CostsByModel` in `src/types/costs.types.ts`: `{ model, tokens_in, tokens_out, cost_usd, … }`).
- `cost_today` (for the bar) = **sum** of the result's `cost_usd` — same `-1 day` rolling
  window as `stats.cost_today`, so the two stay consistent. No second source.
- Refetch when the header's event counter changes (the header already recomputes stats via
  `useStats` on `events.length`); that signal is passed to the meter as an effect dependency.

## State (budget)

`src/store/useBudgetStore.ts` — zustand with `persist` (localStorage):
```ts
interface BudgetState { dailyBudget: number; setDailyBudget: (n: number) => void; }
```
Default `10`. Selector-based access (`useBudgetStore(s => s.dailyBudget)`). If `persist`
(`zustand/middleware`) is not yet used in the project, it is added here.

## Components (one folder per component, under Header)

```
src/store/useBudgetStore.ts                                  ← persisted daily budget
src/components/Header/ConsumptionMeter/ConsumptionMeter.tsx   ← bar (reuses _ui/Progress) + _ui/Popover trigger; fetches getCostsByModel(1)
src/components/Header/ConsumptionMeter/ModelBreakdown.tsx     ← popover content: per-model rows + budget input
src/components/StatsBar/StatsBar.tsx                          ← remove the $ cost_today item (now the meter's job)
src/components/Header/Header.tsx                              ← render <ConsumptionMeter />
src/lib/formatTokens.ts (or a shared util)                    ← extracted from StatsBar, reused by both
```

Feature components consume `_ui/` primitives — `_ui/Progress` (Radix Progress, from the
primitive consolidation) and `_ui/Popover` — never Radix directly. Exact primitive names
confirmed at implementation. All files stay < 300 lines.

## Error handling / edge cases

- Budget `0`/undefined → no divide-by-zero: treat as unbounded (bar neutral/empty); the input
  validates `> 0`.
- No consumption today → empty bar; dropdown shows "No consumption today".
- `getCostsByModel` rejects → graceful fallback: show the plain `$cost_today` (from existing
  `stats`) without the bar/threshold.

## Testing (frontend gate is real)

- `useBudgetStore`: setter updates value; persisted across reloads.
- `ConsumptionMeter`: fill % and threshold color correct for given budget/cost; fallback when
  the fetch rejects.
- `ModelBreakdown`: rows sorted by cost desc; editing the budget input updates the store.
- a11y: the bar is a `button` (opens the popover) with an accessible name; `_ui/Progress`
  carries the proper aria attributes.

## Out of scope (later)

- Other header items (active-sessions badge, current model, notif bell).
- Period toggle (day/7d/30d) in the dropdown.
- Per-model budgets.
- Backend persistence of the budget (an `app_settings` table) — only if app prefs proliferate.
```
