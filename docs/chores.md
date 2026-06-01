# Chores

Maintenance / cleanup tasks — not features, not bugs. Companion to `docs/feature-requests.md` and `docs/bugs.md`.

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

## Done (2026-06-01)

- **Code-quality agent suite** — `state-home-finder`, `ui-promotion-finder`, `component-structure-cleaner`, the `aria-requirements` skill, `accessibility-auditor`, `dead-code-sweeper` in `.claude/`. (Format ref saved in memory.)
- **App shell restructure** — `App › Header / Workspace{Sidebar | DashboardArea{WorkspaceBar, Dashboard, Console}} / Footer`, fixed no-scroll layout, full-height sidebar.
- **`_ui/` primitive consolidation** — InlineImage IPC leak fixed; `ContextBar` → `_ui/` over Radix Progress; `_ui/Dialog` (center+drawer) + `_ui/Popover` replacing hand-rolled overlays/dropdowns; a11y pass (accessible names + form labels).
- **Dead-code sweeps** — orphaned view-router + leftover modules removed across the refactors.
