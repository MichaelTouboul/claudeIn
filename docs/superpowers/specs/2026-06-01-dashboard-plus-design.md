# Dashboard `+` (new-tab launcher) + conversation-loss fix — Design

**Status:** Approved 2026-06-01. **Scope:** MVP. **Cluster:** A (App shell) / workspace tabs.

## Problem

Today every **Dashboard** is bound to a `Project` (`useWorkspaceStore`), and the WorkspaceBar `+` is a `ProjectPicker` (pick a project → project dashboard). We want a Chrome-style new-tab: `+` opens a blank dashboard whose body offers **Open a project**, **New discussion**, or **User-scope agent** (project-less, running in `~`).

Building this surfaces a latent **data-loss bug**: `AgentChat` holds its entire conversation (`messages`, `session`, `claudeSessionId`, `queue`, …) in component-local `useState`, and `Dashboard` renders only the *active* tab's body — so switching dashboards/tabs (exactly what `+` does) **unmounts** `AgentChat` and destroys the conversation. Fixed here as a prerequisite.

## Decisions (from brainstorm)

1. **Launcher = 3 cards** — Open a project / New discussion / User-scope agent. The project picker folds into the launcher.
2. **User-scope cwd = home (`~`)** — sees `~/.claude`, no repo.
3. **Chrome-style** — `+` creates a `launcher` dashboard instantly; picking a card transforms that **same** dashboard in place.
4. **User-scope agent pick = inline searchable list** of `~/.claude/agents`.
5. **Tab identity = icon + title, no project name** for user scope (`🗂 project` / `💬 discussion` / `🤖 agent` / `＋ New tab`).
6. **Conversation-loss fix = keep tabs mounted, hide inactive** (keep-alive: mount on first activation, never unmount). *Not* lifting message state into a store.

## Data model — `useWorkspaceStore`

```ts
type DashboardScope =
  | { kind: 'launcher' }
  | { kind: 'project'; project: Project }
  | { kind: 'user' };

type Dashboard = {
  id: string;
  scope: DashboardScope;
  cwd: string;            // project.path OR home (~)
  tabs: InternalTab[];
  activeTabId: string;    // launcher dashboards may have no real tabs
};
```

New actions:
- `openLauncher(): string` — create a `launcher` dashboard, activate it.
- `resolveLauncher(id, choice)` — mutate that dashboard in place to `project`/`user`, set `cwd`, seed its first tab:
  - `{ to: 'project', project }` → `cwd = project.path`, seed a `chat` tab.
  - `{ to: 'discussion' }` → `cwd = home`, seed a `chat` tab (`agentName: ''`).
  - `{ to: 'agent', agentName }` → `cwd = home`, seed a `chat` tab (`agentName`).
- Keep `openDashboard(project)` (Sidebar/ProjectSwitcher still open project dashboards directly).
- `syncSelectedProject` updates only for `project` scope; for `user`/`launcher`, `selectedProject = null` (and the renderer no longer derives chat cwd from it — see below).

## The `+` flow + `LauncherView`

- `WorkspaceBar` `+` → plain button calling `openLauncher()` (no longer the ProjectPicker dropdown). A **"New tab"** appears instantly.
- `Dashboard` renders `<LauncherView dashboardId>` when the active dashboard's `scope.kind === 'launcher'` (instead of tab bodies).
- `LauncherView` (new feature component, `Workspace/DashboardArea/Dashboard/LauncherView/`): 3 cards.
  - **📁 Open a project** → inline `ProjectPicker` list → `resolveLauncher({to:'project', project})`.
  - **💬 New discussion** → `resolveLauncher({to:'discussion'})`.
  - **🤖 User-scope agent** → card expands into a searchable list of user-scope agents → `resolveLauncher({to:'agent', agentName})`.
- Both user-scope choices are just `chat` tabs with a different `agentName`; `AgentChat` already spawns with `agent_name` + `cwd`.

## cwd threading + keep-alive (the fix)

- **`AgentChat` cwd becomes a prop.** Remove `useAppStore(s => s.selectedProject?.path)` as the spawn cwd source (`AgentChat.tsx:30,76,130`); thread `cwd: string` from `dashboard.cwd` → `ChatTab` → `AgentChat`. Required because multiple dashboards are mounted at once — a background chat must not spawn against the active dashboard's project.
- **Keep tabs mounted, hide inactive.** `Dashboard` (or a new `DashboardSurface`) renders **every activated tab of every dashboard**; only the active dashboard's active tab is visible (`hidden`/`display:none`), the rest stay mounted. **Keep-alive:** track activated tab ids; a tab mounts on first activation and persists. Nothing unmounts → `useState` survives, scroll + live `onEvent` stream preserved.
- File-size: extracting the per-dashboard/per-tab render loop into a small `DashboardSurface` (or `TabHost`) keeps `Dashboard.tsx` under 300 lines.

## Tab identity — `WorkspaceBar`

Label by scope: `🗂 <project.name>` · `💬 <title>` (title via existing `useChatsStore` titling) · `🤖 <agentName>` · `＋ New tab`. Close (`X`) unchanged.

## Backend dependencies

- **`window.api.getHomeDir(): Promise<string>`** — new IPC (home dir for `cwd = ~`). Add: `electron/services` helper (`os.homedir()`) → `ipc` → `preload` → `env.d.ts`. Alternatively `spawn.service` defaults `cwd` to `os.homedir()` when omitted — but an explicit `getHomeDir` keeps the renderer authoritative and is testable.
- **`getAgents()` must include user-scope (`~/.claude/agents`).** Confirm in the plan; if it's project-scoped only, add a user-scope source/filter so the launcher's agent list is real.

## Testing

- `useWorkspaceStore` unit tests: `openLauncher` creates a launcher; `resolveLauncher` transitions scope, sets `cwd`, seeds the right tab; project flow unchanged.
- Render test: a backgrounded chat tab stays mounted — messages survive a dashboard switch (the regression guard).
- `LauncherView` interaction test: three cards resolve correctly; agent search filters.

## Out of scope

- L2 `InternalTabBar` `+` (AddTabMenu) stays as-is.
- Lifting message state into a store (the alternative fix) — not done.
- Dashboard persistence across app restart (separate backlog item).
