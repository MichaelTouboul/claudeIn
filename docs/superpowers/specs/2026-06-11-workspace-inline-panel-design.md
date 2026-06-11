# Workspace Inline Panel — Design

**Date:** 2026-06-11
**Status:** Approved (brainstorming)
**Depends on:** runs last in the sequential chain (after the onboarding chain and the Customize page) to avoid concurrent-worktree conflicts on the Dashboard tree.

## Goal

Refactor the Workspace right panel (`UtilityPanel`) from an **overlay drawer** into
an **inline** panel:
- **No overlay, no blur, no portal** — it is a flex sibling of the chat, not superimposed.
- It **shrinks the chat** (`DashboardSurface`) when open.
- **Scope = the Dashboard content area only** — it must NOT cover the app Header,
  the `WorkspaceBar`, the `Console`, or the Footer.
- **One object at a time, no tabs** — table → just the table, PDF → just the PDF, etc.
  Opening a new object **replaces** the current one. Resize (left-edge drag) is kept.

## Current state

- `DashboardArea` = `WorkspaceBar` (top) + `Dashboard` (flex-1) + `Console` (bottom).
- `Dashboard` = `InternalTabBar` + content area (`LauncherView` / `DashboardSurface` =
  the chat) + `<UtilityPanel/>` rendered via `Dialog variant="drawer-right"` (portal
  overlay that covers everything and dims the background).
- `usePanelStore` = multi-tab model: `tabs[]`, `activeTabId`, `setActive`, `closeTab`,
  `updateTab`, `isOpen`, `width`. Object kinds (`PanelTabKind`): Table / Code / Text /
  Agent / Workflow. `TAB_BODY` maps kind → renderer. Agent/Workflow bodies read live
  data from `useEventsStore`.

## Target design

### 1. Inline placement (scope = Dashboard)
Remove the `Dialog`/drawer wrapper. Render the panel as a flex sibling of
`DashboardSurface` inside the `Dashboard` content row: chat on the left (`flex-1
min-w-0`), panel on the right (fixed `width`, below the `InternalTabBar`). Because it
lives inside the `Dashboard` content area, it never overlaps Header / `WorkspaceBar` /
`Console` / Footer. Keep the left-edge drag-resize (`PanelResizeHandle`), clamped to
the Dashboard width rather than the viewport.

### 2. Single-object store
Replace the multi-tab model in `usePanelStore` with a single current object:
```
{ isOpen, current: PanelObject | null, width, open(object), close(), setWidth }
```
- `PanelObject` = the existing discriminated union (kind + payload), minus the tab `id`/
  list machinery (keep a stable id if a renderer needs one).
- `open(object)` sets `current` (replacing whatever was there) and `isOpen = true`.
- `close()` sets `isOpen = false`.
- Live Agent/Workflow updates: keep reading from `useEventsStore`; if a payload patch
  API is still needed, expose a single `update(patch)` for `current` (no tab targeting).
- Reuse `PanelTabKind` + payload types + `TAB_BODY` renderers unchanged.

### 3. Panel header
No `Tabs`. Header = current object's title + a close button (keep the existing close
affordance and a11y label). Empty state preserved ("Open a table from a response…").

### 4. Migrate callers
Update every `usePanelStore` consumer from the tab API (`addTab`/`updateTab`/`setActive`/
`closeTab`) to `open(object)` / `update(patch)` / `close()`:
- `InternalTabBar` `onOpenPanel`.
- `ResponseBody` "open in panel" actions (table/code/text).
- Agent / Workflow "open" actions.
Grep all references to `usePanelStore` and migrate exhaustively (typecheck enforces it).

## Scope

- **IN:** inline re-layout, single-object store + API, header without tabs, caller
  migration, keep resize, keep kind renderers.
- **OUT:** new object kinds, new viewers (PDF viewer is mentioned only as an example of
  "one object at a time" — no new PDF renderer in this phase unless one already exists).

## Phase (autonomous, gate + merge + push)

- **W** — the whole refactor above in one phase (front-only, moderate). Gate:
  `npm run lint` (0/0), `npm run typecheck`, `npx electron-vite build`, tests
  (panel opens inline, replaces on second open, resize works, callers migrated,
  no overlay/portal remains).
