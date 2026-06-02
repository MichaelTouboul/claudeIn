# Chores

Maintenance / cleanup tasks — not features, not bugs. Companion to `docs/feature-requests.md` and `docs/bugs.md`.

> Effort scale: **Low** (~half day) · **Medium** (~1 day) · **High** (multi-day).

---

## Open

### Flaky test: `settings.service` watch broadcast times out under full-suite parallel load
**Effort:** Low · **Status:** Open (2026-06-02)
`electron/services/settings.service.test.ts` → `watchSettings > broadcasts a recomputed snapshot when a watched layer changes` intermittently fails with a `waitFor` timeout, but **only** during the full parallel `npm run test` run — it passes 6/6 reliably in isolation (`npm run test -- settings.service`). Observed flaking 3× across the settings, agents-mirror, and per-model-costs merges; never a real regression. Likely fs.watch debounce + `waitFor` budget being starved under CPU contention. Fix: raise the test's `waitFor` timeout (and/or the poll), or make the watch test less timing-sensitive (e.g. await the debounce deterministically). Possibly applies to the analogous `agents.mirror` watch test too — harden both.

### `_ui/` Radix follow-ups (deferred from the consolidation)
**Effort:** Low–Medium · **Status:** Open
"Watch, not yet" items deferred from the `_ui/` primitive consolidation:
- rewrap `_ui/Tabs` over `@radix-ui/react-tabs` (a11y / keyboard hardening)
- `AgentDetail/EditField`'s native `<select>` → a `_ui/Select` over Radix Select
- `Sidebar/ResizeHandle` → Radix Separator (note: it's a *drag* handle; Separator is presentational only — low value)

Low urgency — do when next working in those areas.

---

## Done (2026-06-01)

- **Code-quality agent suite** — `state-home-finder`, `ui-promotion-finder`, `component-structure-cleaner`, the `aria-requirements` skill, `accessibility-auditor`, `dead-code-sweeper` in `.claude/`. (Format ref saved in memory.)
- **App shell restructure** — `App › Header / Workspace{Sidebar | DashboardArea{WorkspaceBar, Dashboard, Console}} / Footer`, fixed no-scroll layout, full-height sidebar.
- **`_ui/` primitive consolidation** — InlineImage IPC leak fixed; `ContextBar` → `_ui/` over Radix Progress; `_ui/Dialog` (center+drawer) + `_ui/Popover` replacing hand-rolled overlays/dropdowns; a11y pass (accessible names + form labels).
- **Dead-code sweeps** — orphaned view-router + leftover modules removed across the refactors.
