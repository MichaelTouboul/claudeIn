# Customize Page + MCP Migration — Design

**Date:** 2026-06-11
**Status:** Approved (brainstorming)
**Depends on:** Onboarding refactor P1 (favorite repos), P2 (router), P3 (Home entry). Starts after the onboarding chain (P5) merges to avoid concurrent-worktree conflicts on `useAppStore` / `App.tsx` / `src/env.d.ts`.

## Goal

Create a real **Customize** page (4th top-level router page) and **migrate the MCP
management logic** into its **Connectors** section. Skills nav + the "Customize
Claude" hero are built as **placeholders with no business logic** for now. The MCP
panel is **removed** from the Dashboard — Customize becomes the single home of MCP
management.

Reference mockups: a left sidebar with a favorite-repos scope dropdown, Skills /
Connectors nav, scoped server lists ("current repo" + "Personal"), a master-detail
content area, and a "Customize Claude" hero card when nothing is selected.

## 1. Router integration

- `AppPage` (in `src/store/useAppStore.ts`) gains `Customize: 'customize'`.
- `App.tsx` router renders `<CustomizePage>` for that page (extend the existing
  enum→component `Record`, no fallback chain).
- Entry: an action/card on the **Home** page ("Customize Claude") → `navigate('customize')`.
- `CustomizePage` top bar has a `← Customize` control → `navigate('home')`.

## 2. Page structure (master-detail)

- **`CustomizePage`** — top bar (`←` + title + avatar) + body (sidebar + content).
- **`CustomizeSidebar`**
  - `RepoScopeDropdown` — favorite repos from `favoriteRepos:list`; selecting one
    sets the active project scope.
  - Nav: `CustomizeSection` `as const` enum (`Skills` | `Connectors`) + a
    section→content `Record` map.
  - Scoped lists: for **Connectors**, MCP servers grouped into a "current repo"
    (project scope) section + a "Personal" (user scope) section, each with a "+" add.
- **`CustomizeContent`**
  - Default (nothing selected) → `CustomizeHero`: "Customize Claude" + 3 placeholder
    options (Connect your apps / Create new skills / Browse plugins). **No logic.**
  - Connectors + a server selected → `ConnectorDetail`: migrated MCP detail/edit.
  - Skills → `SkillsPlaceholder`: visual only, no logic.

## 3. MCP migration (the core)

Reuse the existing logic **as-is**: `useMcpManage`, `mcpPresentation`,
`mcpFormFields`, `mcpFormParse`, `mcpRowEdit`, `McpServerForm`,
`McpFormTransportFields`, `McpRawConfig`, `McpRemoveDialog`, `McpRestartBanner`,
`McpAddDialog`, `McpServerBadges`. `getMcp(projectPath?)` already handles project vs
user scope. **Re-layout** the presentation from the current single list panel into
sidebar-list (grouped by scope) + detail pane. Move the MCP component tree from
`Workspace/DashboardArea/Dashboard/McpView/` to a location owned by the Customize
page (e.g. `components/CustomizePage/Connectors/`), keeping the hooks/pure modules
intact. Preserve all behavior: add, edit, remove (confirm), view-raw, restart banner.

## 4. Removal from Dashboard

Remove `McpNavItem` (`Workspace/Sidebar/PanelsArea/`) and the `McpView` mount inside
the Dashboard. No MCP entry remains in the per-project dashboard. Update/relocate the
relevant tests.

## 5. State

Page-scoped UI selection (active section, active repo scope, selected server) is read
by both the sidebar and the content pane → a focused `useCustomizeStore` (zustand) or
`CustomizePage`-level state passed via props, per `src/CLAUDE.md` state decision tree.
Finite section state modeled as the `CustomizeSection` enum + behavior map.

## 6. Scope

- **IN:** page shell, router + Home entry, repo scope dropdown, Skills/Connectors nav,
  Connectors master-detail with full MCP logic migrated, hero placeholder, MCP removal
  from Dashboard.
- **OUT (later):** Skills logic, Agents, plugin bundles in the sidebar, the markdown
  skill/agent detail views, Edit flows for skills/agents.

## 7. Phases (autonomous, gate + merge + push between each)

- **C1+C2 (combined)** — router + Home entry + `CustomizePage` shell + `CustomizeHero`
  placeholder + Connectors master-detail (repo dropdown scope, grouped server list,
  detail/edit reusing `useMcpManage`) + remove MCP from Dashboard.
- **C3** — Skills nav + `SkillsPlaceholder` + polish/a11y pass.

Gate per phase: `npm run lint` (0/0), `npm run typecheck`, `npx electron-vite build`,
tests.
