# Chores

Maintenance / cleanup tasks — not features, not bugs. Companion to the feature backlog (`docs/feature-requests-mvp.md` + `docs/feature-requests-no-mvp.md`) and `docs/bugs.md`.

> Effort scale: **Low** (~half day) · **Medium** (~1 day) · **High** (multi-day).

---

## Open

### `_ui/` Radix follow-ups (deferred from the consolidation)
**Effort:** Low–Medium · **Status:** Open
"Watch, not yet" items deferred from the `_ui/` primitive consolidation:
- rewrap `_ui/Tabs` over `@radix-ui/react-tabs` (a11y / keyboard hardening)
- `AgentDetail/EditField`'s native `<select>` → a `_ui/Select` over Radix Select
- `Sidebar/ResizeHandle` → Radix Separator (note: it's a *drag* handle; Separator is presentational only — low value)

Low urgency — do when next working in those areas.

---

## Done (2026-06-03)

- **Flaky fs.watch broadcast tests stabilized** — the watch-broadcast tests (`settings.service`, `agents.mirror`, `skills.mirror`, `memory.mirror`) timed out under full-parallel `npm run test`: fs.watch registration latency + the ~150ms debounce racing a same-tick write, plus a too-tight `waitFor` budget. Fixed test-side only (no service/debounce changes), mirroring the robust `mcp.mirror`/`conversation.tail` pattern: added a `settle()` await (~80ms) after each `watchX()` and before the first mutation (incl. the diff-guard tests), and raised each `waitFor` timeout to 5000ms. Assertions unchanged (broadcast-fires + diff-guard still asserted). Verified green across 3 consecutive full-suite runs.

## Done (2026-06-01)

- **Code-quality agent suite** — `state-home-finder`, `ui-promotion-finder`, `component-structure-cleaner`, the `aria-requirements` skill, `accessibility-auditor`, `dead-code-sweeper` in `.claude/`. (Format ref saved in memory.)
- **App shell restructure** — `App › Header / Workspace{Sidebar | DashboardArea{WorkspaceBar, Dashboard, Console}} / Footer`, fixed no-scroll layout, full-height sidebar.
- **`_ui/` primitive consolidation** — InlineImage IPC leak fixed; `ContextBar` → `_ui/` over Radix Progress; `_ui/Dialog` (center+drawer) + `_ui/Popover` replacing hand-rolled overlays/dropdowns; a11y pass (accessible names + form labels).
- **Dead-code sweeps** — orphaned view-router + leftover modules removed across the refactors.
