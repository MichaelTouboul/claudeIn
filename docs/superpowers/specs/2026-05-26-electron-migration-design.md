# Agent Manager — Electron Migration (v1)

## Goal

Port the existing web app (Express + PostgreSQL + React) into a native macOS Electron app. Same UI, same features, no Docker, no exposed HTTP server, no external database. The `.app` runs standalone with zero dependencies beyond the Claude CLI.

## Why Electron

1. **Real terminal (PTY)** — xterm.js + node-pty for a native terminal, not a fake textarea
2. **Rich media inline** — mix terminal output with rendered images, markdown, diffs
3. **Zero API key** — everything goes through the Claude CLI, no Anthropic API needed
4. **Security** — secrets in `~/.claude/` never leave the process, no HTTP port exposed
5. **Distribution** — a `.dmg`, not "install Docker + npm start"

Electron chosen over Tauri because: native Node.js child_process (proven stdin/stdout streaming for `claude --print`), same stack the team already knows (TypeScript + React + Node), and Claude Desktop itself is Electron.

## Architecture

```
┌─────────────────────────────────────────────┐
│  Electron Main Process (Node.js)            │
│  ├─ IPC handlers (replace Express routes)   │
│  ├─ SQLite via better-sqlite3               │
│  ├─ Services (agent, project, spawn,        │
│  │   events, memory, costs, links, etc.)    │
│  └─ Push events via webContents.send()      │
├─────────────────────────────────────────────┤
│  Preload (contextBridge)                    │
│  └─ window.api = typed IPC methods          │
├─────────────────────────────────────────────┤
│  Renderer (React + Tailwind, unchanged)     │
│  └─ window.api.xxx() instead of fetch()     │
└─────────────────────────────────────────────┘
```

## Window Model

Single window. Tabs for navigation between views within a project. Project switcher in the top bar. Session restore on relaunch (last project, open tabs, scroll position).

On first launch: project grid (same as current home screen). On subsequent launches: restore last session, with project switcher always accessible.

## Layout

Sidebar (left) + main area (center/right). Same as current ProjectDashboard layout. Terminal will be added as a bottom panel in v2, not in this migration.

## File Structure

```
claude-agent-manager/
├── electron/
│   ├── main.ts                 # App entry, BrowserWindow, app lifecycle
│   ├── preload.ts              # contextBridge, exposes window.api
│   ├── ipc/
│   │   ├── agents.ipc.ts       # CRUD agents (replaces routes/agents.ts)
│   │   ├── projects.ipc.ts     # Project scanning + dashboard
│   │   ├── spawn.ipc.ts        # Spawn claude CLI, session management
│   │   ├── events.ipc.ts       # Event ingestion + push to renderer
│   │   ├── memory.ipc.ts       # Project memory CRUD
│   │   ├── costs.ipc.ts        # Cost analytics queries
│   │   ├── favorites.ipc.ts    # Favorites CRUD
│   │   ├── missions.ipc.ts     # Mission lifecycle
│   │   └── index.ts            # registerAllHandlers()
│   └── services/
│       ├── db.ts               # SQLite init, migrations, prepared statements
│       ├── agent.service.ts    # Read/write agent .md files (from server/)
│       ├── project.service.ts  # Scan for .claude/ directories (from server/)
│       ├── spawn.service.ts    # child_process.spawn claude CLI (from server/)
│       ├── events.service.ts   # Event storage + queries (from server/)
│       ├── memory.service.ts   # Project memory file ops (from server/)
│       ├── costs.service.ts    # Cost aggregation queries (from server/)
│       ├── links.service.ts    # Agent-project links (from server/)
│       ├── favorites.service.ts # Favorites storage (from server/)
│       └── missions.service.ts # Mission lifecycle (from server/)
├── src/                        # React renderer (moved from client/src/)
│   ├── App.tsx                 # Unchanged
│   ├── components/             # All existing components, unchanged
│   ├── hooks/
│   │   ├── useIPC.ts           # Replaces useSSE.ts (ipcRenderer.on)
│   │   ├── useProjects.ts      # window.api instead of fetch
│   │   ├── useStats.ts         # Unchanged
│   │   ├── useFavorites.ts     # window.api instead of fetch
│   │   └── useAgents.ts        # window.api instead of fetch
│   ├── services/
│   │   └── api.ts              # window.api.xxx() instead of fetch()
│   ├── store/
│   │   └── useAppStore.ts      # Unchanged
│   └── types/                  # Unchanged
├── electron-builder.yml        # Packaging config (DMG, signing)
├── vite.config.ts              # electron-vite config
├── package.json                # Single package (no workspaces)
└── tsconfig.json
```

**Removed:**
- `server/` directory (absorbed into `electron/`)
- `client/` directory (becomes `src/`)
- `docker-compose.yml`
- `start.sh`

## Migration Layer by Layer

### Database: PostgreSQL → SQLite (better-sqlite3)

Same 4 tables (events, missions, agent_project_links, favorites). Syntax changes:

| PostgreSQL | SQLite |
|---|---|
| `SERIAL PRIMARY KEY` | `INTEGER PRIMARY KEY AUTOINCREMENT` |
| `TIMESTAMPTZ` | `TEXT` (ISO 8601) |
| `JSONB` | `TEXT` (JSON.stringify) |
| `NOW()` | `datetime('now')` |
| `async pool.query(sql, params)` → `result.rows` | `db.prepare(sql).all(...params)` (synchronous) |

SQLite file stored at: `~/.claude-agent-manager/data.db`

### Routes → IPC Handlers

Each Express route file becomes an IPC handler file. The mapping is 1:1:

| Express route | IPC handler | IPC channels |
|---|---|---|
| `GET /api/agents` | `agents.ipc.ts` | `agents:list`, `agents:get`, `agents:create`, `agents:update`, `agents:delete` |
| `GET /api/projects` | `projects.ipc.ts` | `projects:list`, `projects:get`, `projects:dashboard` |
| `POST /api/spawn` | `spawn.ipc.ts` | `spawn:start`, `spawn:input`, `spawn:kill`, `spawn:list` |
| `GET /api/events` | `events.ipc.ts` | `events:recent`, `events:by-agent` |
| `GET /api/memory/:id` | `memory.ipc.ts` | `memory:list`, `memory:update`, `memory:delete` |
| `GET /api/costs` | `costs.ipc.ts` | `costs:by-day`, `costs:by-agent`, `costs:by-tool` |
| `POST /api/favorites` | `favorites.ipc.ts` | `favorites:list`, `favorites:toggle` |
| `POST /api/hooks` | _removed_ | Hooks are ingested directly, no HTTP needed |

Handler pattern:
```typescript
// electron/ipc/agents.ipc.ts
ipcMain.handle("agents:list", async () => {
  return agentService.getAllAgents();
});

ipcMain.handle("agents:update", async (_event, name: string, payload) => {
  return agentService.updateAgent(name, payload);
});
```

### SSE → IPC Push

`broadcast()` changes from writing to HTTP Response streams to sending via IPC:

```typescript
// electron/services/spawn.service.ts
import { BrowserWindow } from "electron";

function broadcast(data: unknown) {
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send("push-event", data);
  });
}
```

### Preload (contextBridge)

```typescript
// electron/preload.ts
contextBridge.exposeInMainWorld("api", {
  // Invoke (request-response)
  getAgents: () => ipcRenderer.invoke("agents:list"),
  getAgent: (name: string) => ipcRenderer.invoke("agents:get", name),
  updateAgent: (name: string, payload: unknown) => ipcRenderer.invoke("agents:update", name, payload),
  deleteAgent: (name: string) => ipcRenderer.invoke("agents:delete", name),
  createAgent: (payload: unknown) => ipcRenderer.invoke("agents:create", payload),

  getProjects: () => ipcRenderer.invoke("projects:list"),
  getDashboard: (id: string) => ipcRenderer.invoke("projects:dashboard", id),

  spawn: (opts: unknown) => ipcRenderer.invoke("spawn:start", opts),
  sendInput: (sessionId: string, text: string) => ipcRenderer.invoke("spawn:input", sessionId, text),
  killSession: (sessionId: string) => ipcRenderer.invoke("spawn:kill", sessionId),

  getProjectMemory: (id: string) => ipcRenderer.invoke("memory:list", id),
  updateProjectMemoryFile: (id: string, name: string, content: string) => ipcRenderer.invoke("memory:update", id, name, content),
  deleteProjectMemoryFile: (id: string, name: string) => ipcRenderer.invoke("memory:delete", id, name),

  updateMemoryFile: (agent: string, name: string, content: string) => ipcRenderer.invoke("agents:memory:update", agent, name, content),
  deleteMemoryFile: (agent: string, name: string) => ipcRenderer.invoke("agents:memory:delete", agent, name),

  getCostsByDay: () => ipcRenderer.invoke("costs:by-day"),
  getCostsByAgent: () => ipcRenderer.invoke("costs:by-agent"),
  getCostsByTool: () => ipcRenderer.invoke("costs:by-tool"),

  getFavorites: (projectId: string) => ipcRenderer.invoke("favorites:list", projectId),
  toggleFavorite: (projectId: string, type: string, name: string) => ipcRenderer.invoke("favorites:toggle", projectId, type, name),

  getLinks: (projectId: string) => ipcRenderer.invoke("links:list", projectId),
  linkAgent: (agent: string, projectId: string) => ipcRenderer.invoke("links:add", agent, projectId),
  unlinkAgent: (agent: string, projectId: string) => ipcRenderer.invoke("links:remove", agent, projectId),

  // Push events (server → renderer)
  onEvent: (cb: (data: unknown) => void) => {
    const handler = (_e: unknown, data: unknown) => cb(data);
    ipcRenderer.on("push-event", handler);
    return () => ipcRenderer.removeListener("push-event", handler);
  },
});
```

### Renderer Changes

**`src/services/api.ts`** — Every `fetch("/api/...")` becomes `window.api.xxx()`:

```typescript
export const api = {
  getAgents: () => window.api.getAgents(),
  getAgent: (name: string) => window.api.getAgent(name),
  updateAgent: (name: string, payload: unknown) => window.api.updateAgent(name, payload),
  // ... 1:1 mapping
};
```

**`src/hooks/useSSE.ts` → `src/hooks/useIPC.ts`** — EventSource replaced by ipcRenderer.on:

```typescript
useEffect(() => {
  const cleanup = window.api.onEvent((data) => {
    // same logic as current onmessage handler
  });
  setConnected(true);
  return cleanup;
}, [markActive]);
```

**All React components** — unchanged. They import from `api.ts` and `useIPC.ts`, which are the only files that change interface.

## Tooling

- **electron-vite** — builds main, preload, and renderer. Hot reload in dev.
- **electron-builder** — packages as `.dmg` for macOS. Code signing + notarization when certs configured.
- **better-sqlite3** — synchronous SQLite. Needs to be rebuilt for Electron's Node version via `electron-rebuild`.
- **TypeScript** — strict mode, same config as current project.

## What Is NOT In Scope (v1)

- Terminal PTY (bottom panel) — v2
- Dashboard persistence (multiple dashboards per project) — v2
- Project-scoped chat (non-agent chat in dashboard) — v2
- Session JSONL ingestion (reading Claude Code's session files) — v2
- Auto-update — v2
- Code signing and notarization — v2
- Windows/Linux support — v2

## Migration Order

1. Scaffold Electron project with electron-vite
2. Set up SQLite (db.ts with same schema)
3. Copy services from server/ to electron/services/, adapt db calls
4. Create IPC handlers (one per Express route)
5. Create preload.ts (contextBridge)
6. Move React from client/src/ to src/
7. Adapt api.ts (fetch → window.api)
8. Replace useSSE with useIPC
9. Test all features
10. Remove server/, client/, docker-compose.yml, start.sh
