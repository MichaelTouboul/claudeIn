# Electron Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Agent Manager from Express+PostgreSQL+React web app to a standalone Electron desktop app with SQLite, IPC, and zero external dependencies.

**Architecture:** The Express server becomes Electron's main process. PostgreSQL becomes SQLite via better-sqlite3. SSE becomes IPC push via webContents.send(). React renderer stays identical except fetch() calls become window.api.xxx() via contextBridge. Routes become ipcMain.handle() handlers.

**Tech Stack:** Electron, electron-vite, React 18, TypeScript, Tailwind CSS 3, better-sqlite3, zustand, lucide-react

**Testing:** No test framework. Verification is visual — launch the Electron app and confirm each feature works. TypeScript compilation serves as the correctness check.

---

## File Map

### Files to create (electron/ layer)

| File | Responsibility |
|------|---------------|
| `electron/main.ts` | App entry, BrowserWindow creation, app lifecycle, session restore |
| `electron/preload.ts` | contextBridge exposing typed window.api |
| `electron/ipc/index.ts` | Register all IPC handlers |
| `electron/ipc/agents.ipc.ts` | Agent CRUD + memory file handlers |
| `electron/ipc/projects.ipc.ts` | Project scanning + dashboard aggregation + links |
| `electron/ipc/spawn.ipc.ts` | Spawn claude CLI, session management |
| `electron/ipc/events.ipc.ts` | Event ingestion + stats queries |
| `electron/ipc/memory.ipc.ts` | Project memory CRUD |
| `electron/ipc/costs.ipc.ts` | Cost analytics queries |
| `electron/ipc/favorites.ipc.ts` | Favorites CRUD |
| `electron/ipc/missions.ipc.ts` | Mission lifecycle |
| `electron/services/db.ts` | SQLite init via better-sqlite3 |
| `electron/services/broadcast.ts` | webContents.send() to all windows |

### Files to copy and adapt (electron/services/)

These are copied from `server/src/services/` with two changes: (1) import `db` instead of `pool`, (2) use `db.prepare().xxx()` instead of `await pool.query()`.

| Source | Destination |
|--------|-------------|
| `server/src/services/agent.service.ts` | `electron/services/agent.service.ts` (no DB, unchanged) |
| `server/src/services/project.service.ts` | `electron/services/project.service.ts` (no DB, unchanged) |
| `server/src/services/spawn.service.ts` | `electron/services/spawn.service.ts` (broadcast changes) |
| `server/src/services/events.service.ts` | `electron/services/events.service.ts` (pg → sqlite) |
| `server/src/services/costs.service.ts` | `electron/services/costs.service.ts` (pg → sqlite) |
| `server/src/services/links.service.ts` | `electron/services/links.service.ts` (pg → sqlite) |
| `server/src/services/favorites.service.ts` | `electron/services/favorites.service.ts` (pg → sqlite) |
| `server/src/services/missions.service.ts` | `electron/services/missions.service.ts` (pg → sqlite) |
| `server/src/services/memory.service.ts` | `electron/services/memory.service.ts` (no DB, unchanged) |

### Files to copy and adapt (renderer)

| Source | Destination | Changes |
|--------|-------------|---------|
| `client/src/**/*` | `src/**/*` | Moved one level up |
| `src/services/api.ts` | Same | fetch → window.api |
| `src/hooks/useSSE.ts` | `src/hooks/useIPC.ts` | EventSource → ipcRenderer.on |
| `src/hooks/useFavorites.ts` | Same | fetch → window.api |
| `src/hooks/useProjects.ts` | Same | fetch → window.api |
| `src/components/ProjectDashboard.tsx` | Same | fetch → window.api (link/unlink) |
| `src/components/AgentChat.tsx` | Same | fetch → window.api + EventSource → window.api.onEvent |

### Files to create (config)

| File | Responsibility |
|------|---------------|
| `package.json` | Single package, electron-vite scripts, all deps |
| `electron-builder.yml` | macOS DMG packaging config |
| `vite.config.ts` | electron-vite config (main + preload + renderer) |
| `tsconfig.json` | Root config |
| `tsconfig.node.json` | Main process config |
| `tsconfig.web.json` | Renderer config |
| `src/env.d.ts` | TypeScript declarations for window.api |

### Files to delete

| File | Reason |
|------|--------|
| `server/` (entire directory) | Absorbed into electron/ |
| `client/` (entire directory) | Becomes src/ |
| `docker-compose.yml` | No more Docker |
| `start.sh` | Replaced by electron-vite dev |

### Types (shared)

| Source | Destination |
|--------|-------------|
| `server/src/types/agent.types.ts` | `electron/types/agent.types.ts` |
| `server/src/types/project.types.ts` | `electron/types/project.types.ts` |
| `server/src/types/spawn.types.ts` | `electron/types/spawn.types.ts` |
| `client/src/types/agent.types.ts` | `src/types/agent.types.ts` (unchanged) |
| `client/src/types/spawn.types.ts` | `src/types/spawn.types.ts` (unchanged) |

---

## Phase 1: Scaffold Electron Project

### Task 1: Initialize electron-vite project and install dependencies

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json`
- Create: `electron-builder.yml`

- [ ] **Step 1: Remove existing workspace package.json and install electron-vite**

From project root `/Users/michaeltouboul/claude-agent-manager`:

```bash
rm package.json package-lock.json
npm init -y
npm install --save-dev electron electron-vite electron-builder @types/node typescript
npm install --save-dev @vitejs/plugin-react vite
npm install --save-dev autoprefixer postcss tailwindcss
npm install react react-dom lucide-react react-markdown recharts zustand
npm install better-sqlite3
npm install --save-dev @types/better-sqlite3 @types/react @types/react-dom
npm install gray-matter
```

- [ ] **Step 2: Create package.json scripts**

Replace `package.json` scripts section:

```json
{
  "name": "claude-agent-manager",
  "version": "2.0.0",
  "private": true,
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "package": "electron-builder",
    "preview": "electron-vite preview"
  }
}
```

- [ ] **Step 3: Create vite.config.ts**

```typescript
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "dist-electron",
      lib: {
        entry: "electron/main.ts",
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "dist-electron",
      lib: {
        entry: "electron/preload.ts",
      },
    },
  },
  renderer: {
    root: "src",
    build: {
      outDir: path.resolve(__dirname, "dist"),
      rollupOptions: {
        input: path.resolve(__dirname, "src/index.html"),
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
  },
});
```

- [ ] **Step 4: Create tsconfig files**

`tsconfig.json`:
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.web.json" }
  ]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist-electron",
    "rootDir": ".",
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["electron/**/*.ts"]
}
```

`tsconfig.web.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
```

- [ ] **Step 5: Create electron-builder.yml**

```yaml
appId: com.claude-agent-manager.app
productName: Agent Manager
mac:
  category: public.app-category.developer-tools
  target:
    - dmg
dmg:
  contents:
    - x: 410
      y: 150
      type: link
      path: /Applications
    - x: 130
      y: 150
      type: file
files:
  - dist-electron
  - dist
```

- [ ] **Step 6: Commit**

```bash
git add package.json vite.config.ts tsconfig.json tsconfig.node.json tsconfig.web.json electron-builder.yml
git commit -m "chore: scaffold electron-vite project with dependencies"
```

---

## Phase 2: Electron Main Process Foundation

### Task 2: Create SQLite database service

**Files:**
- Create: `electron/services/db.ts`

- [ ] **Step 1: Create db.ts with same schema as PostgreSQL**

```typescript
import Database from "better-sqlite3";
import path from "path";
import { app } from "electron";
import fs from "fs";

const DB_DIR = path.join(app.getPath("home"), ".claude-agent-manager");
const DB_PATH = path.join(DB_DIR, "data.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return db;
}

export function initDb(): void {
  fs.mkdirSync(DB_DIR, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_name TEXT NOT NULL,
      session_id TEXT,
      event_type TEXT NOT NULL,
      tool_name TEXT,
      payload TEXT DEFAULT '{}',
      tokens_in INTEGER DEFAULT 0,
      tokens_out INTEGER DEFAULT 0,
      cost_usd REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS missions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_name TEXT NOT NULL,
      title TEXT,
      status TEXT DEFAULT 'running' CHECK (status IN ('running', 'done', 'failed')),
      session_id TEXT,
      tokens_in_total INTEGER DEFAULT 0,
      tokens_out_total INTEGER DEFAULT 0,
      cost_usd_total REAL DEFAULT 0,
      events_count INTEGER DEFAULT 0,
      started_at TEXT DEFAULT (datetime('now')),
      finished_at TEXT
    );

    CREATE TABLE IF NOT EXISTS agent_project_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_name TEXT NOT NULL,
      project_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(agent_name, project_id)
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_type TEXT NOT NULL CHECK (item_type IN ('agent', 'skill', 'hook')),
      item_name TEXT NOT NULL,
      project_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(item_type, item_name, project_id)
    );

    CREATE INDEX IF NOT EXISTS idx_events_agent ON events(agent_name);
    CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
    CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
    CREATE INDEX IF NOT EXISTS idx_missions_agent ON missions(agent_name);
    CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
    CREATE INDEX IF NOT EXISTS idx_links_project ON agent_project_links(project_id);
    CREATE INDEX IF NOT EXISTS idx_links_agent ON agent_project_links(agent_name);
    CREATE INDEX IF NOT EXISTS idx_favorites_project ON favorites(project_id);
  `);
}
```

- [ ] **Step 2: Commit**

```bash
git add electron/services/db.ts
git commit -m "feat: add SQLite database service with same schema"
```

### Task 3: Create broadcast service and copy filesystem-only services

**Files:**
- Create: `electron/services/broadcast.ts`
- Copy: `electron/services/agent.service.ts` (from server, no changes needed)
- Copy: `electron/services/project.service.ts` (from server, no changes needed)
- Copy: `electron/services/memory.service.ts` (from server, no changes needed)
- Copy: `electron/types/agent.types.ts`
- Copy: `electron/types/project.types.ts`
- Copy: `electron/types/spawn.types.ts`

- [ ] **Step 1: Create broadcast.ts**

```typescript
import { BrowserWindow } from "electron";

export function broadcast(data: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send("push-event", data);
  }
}
```

- [ ] **Step 2: Copy filesystem-only services (no DB, no changes)**

```bash
mkdir -p electron/services electron/types
cp server/src/services/agent.service.ts electron/services/agent.service.ts
cp server/src/services/project.service.ts electron/services/project.service.ts
cp server/src/services/memory.service.ts electron/services/memory.service.ts
cp server/src/types/agent.types.ts electron/types/agent.types.ts
cp server/src/types/project.types.ts electron/types/project.types.ts
cp server/src/types/spawn.types.ts electron/types/spawn.types.ts
```

- [ ] **Step 3: Fix imports in copied services**

In `electron/services/agent.service.ts`, `project.service.ts`, `memory.service.ts`: change all `../types/xxx.js` imports to `../types/xxx.js` (same pattern, should work). Remove any `.js` extensions if electron-vite resolves without them — test at build time.

The key import fix: these files import from each other with `.js` extensions. In electron-vite with bundler moduleResolution, `.js` extensions in imports should be removed or kept depending on the tsconfig. Since we set `"moduleResolution": "bundler"`, remove `.js` from all import paths in the copied files:

```bash
# In electron/services/ and electron/types/, remove .js from imports
sed -i '' 's/\.js"/"/' electron/services/agent.service.ts
sed -i '' 's/\.js"/"/' electron/services/project.service.ts
sed -i '' 's/\.js"/"/' electron/services/memory.service.ts
sed -i '' 's/\.js"/"/' electron/types/project.types.ts
```

- [ ] **Step 4: Commit**

```bash
git add electron/
git commit -m "feat: add broadcast service and copy filesystem-only services"
```

### Task 4: Adapt DB-dependent services (pg → sqlite)

**Files:**
- Create: `electron/services/events.service.ts`
- Create: `electron/services/costs.service.ts`
- Create: `electron/services/links.service.ts`
- Create: `electron/services/favorites.service.ts`
- Create: `electron/services/missions.service.ts`

- [ ] **Step 1: Create events.service.ts**

```typescript
import { getDb } from "./db";
import { broadcast } from "./broadcast";

type HookEvent = {
  agent_name: string;
  session_id?: string;
  event_type: string;
  tool_name?: string;
  payload?: Record<string, unknown>;
  tokens_in?: number;
  tokens_out?: number;
  cost_usd?: number;
};

export function ingestEvent(event: HookEvent) {
  const db = getDb();

  const result = db.prepare(
    `INSERT INTO events (agent_name, session_id, event_type, tool_name, payload, tokens_in, tokens_out, cost_usd)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING *`
  ).get(
    event.agent_name,
    event.session_id || null,
    event.event_type,
    event.tool_name || null,
    JSON.stringify(event.payload || {}),
    event.tokens_in || 0,
    event.tokens_out || 0,
    event.cost_usd || 0
  ) as Record<string, unknown>;

  if (event.session_id) {
    db.prepare(
      `UPDATE missions SET
        tokens_in_total = tokens_in_total + ?,
        tokens_out_total = tokens_out_total + ?,
        cost_usd_total = cost_usd_total + ?,
        events_count = events_count + 1
       WHERE session_id = ?`
    ).run(event.tokens_in || 0, event.tokens_out || 0, event.cost_usd || 0, event.session_id);
  }

  if (event.event_type === "Stop" && event.session_id) {
    db.prepare(
      `UPDATE missions SET status = 'done', finished_at = datetime('now') WHERE session_id = ? AND status = 'running'`
    ).run(event.session_id);
  }

  broadcast({ type: "event", ...result });

  return result;
}

export function getRecentEvents(limit = 50) {
  return getDb().prepare(`SELECT * FROM events ORDER BY created_at DESC LIMIT ?`).all(limit);
}

export function getEventsByAgent(agentName: string, limit = 50) {
  return getDb().prepare(`SELECT * FROM events WHERE agent_name = ? ORDER BY created_at DESC LIMIT ?`).all(agentName, limit);
}

export function getStats() {
  return getDb().prepare(`
    SELECT
      COUNT(DISTINCT session_id) AS active_sessions,
      COUNT(*) AS total_events,
      COALESCE(SUM(tokens_in), 0) AS total_tokens_in,
      COALESCE(SUM(tokens_out), 0) AS total_tokens_out,
      COALESCE(SUM(cost_usd), 0) AS total_cost,
      COUNT(CASE WHEN created_at > datetime('now', '-1 day') THEN 1 END) AS events_today,
      COALESCE(SUM(CASE WHEN created_at > datetime('now', '-1 day') THEN cost_usd ELSE 0 END), 0) AS cost_today
    FROM events
  `).get();
}

export function getStatsPerAgent() {
  return getDb().prepare(`
    SELECT
      agent_name,
      COUNT(*) AS events_count,
      COALESCE(SUM(tokens_in), 0) AS tokens_in,
      COALESCE(SUM(tokens_out), 0) AS tokens_out,
      COALESCE(SUM(cost_usd), 0) AS cost_usd,
      MAX(created_at) AS last_active
    FROM events
    GROUP BY agent_name
    ORDER BY cost_usd DESC
  `).all();
}
```

- [ ] **Step 2: Create costs.service.ts**

```typescript
import { getDb } from "./db";

export function getCostsByDay(days = 30) {
  return getDb().prepare(
    `SELECT
      DATE(created_at) AS day,
      COALESCE(SUM(tokens_in), 0) AS tokens_in,
      COALESCE(SUM(tokens_out), 0) AS tokens_out,
      COALESCE(SUM(cost_usd), 0) AS cost_usd,
      COUNT(*) AS events_count
    FROM events
    WHERE created_at > datetime('now', '-' || ? || ' days')
    GROUP BY DATE(created_at)
    ORDER BY day ASC`
  ).all(days);
}

export function getCostsByAgent(days = 30) {
  return getDb().prepare(
    `SELECT
      agent_name,
      COALESCE(SUM(tokens_in), 0) AS tokens_in,
      COALESCE(SUM(tokens_out), 0) AS tokens_out,
      COALESCE(SUM(cost_usd), 0) AS cost_usd,
      COUNT(*) AS events_count,
      COUNT(DISTINCT DATE(created_at)) AS active_days,
      MIN(created_at) AS first_seen,
      MAX(created_at) AS last_seen
    FROM events
    WHERE created_at > datetime('now', '-' || ? || ' days')
    GROUP BY agent_name
    ORDER BY cost_usd DESC`
  ).all(days);
}

export function getCostsByAgentPerDay(days = 30) {
  return getDb().prepare(
    `SELECT
      DATE(created_at) AS day,
      agent_name,
      COALESCE(SUM(tokens_in), 0) AS tokens_in,
      COALESCE(SUM(tokens_out), 0) AS tokens_out,
      COALESCE(SUM(cost_usd), 0) AS cost_usd
    FROM events
    WHERE created_at > datetime('now', '-' || ? || ' days')
    GROUP BY DATE(created_at), agent_name
    ORDER BY day ASC, cost_usd DESC`
  ).all(days);
}

export function getCostsByTool(days = 30) {
  return getDb().prepare(
    `SELECT
      COALESCE(tool_name, 'unknown') AS tool_name,
      COALESCE(SUM(tokens_in), 0) AS tokens_in,
      COALESCE(SUM(tokens_out), 0) AS tokens_out,
      COALESCE(SUM(cost_usd), 0) AS cost_usd,
      COUNT(*) AS call_count
    FROM events
    WHERE tool_name IS NOT NULL
      AND created_at > datetime('now', '-' || ? || ' days')
    GROUP BY tool_name
    ORDER BY cost_usd DESC`
  ).all(days);
}

export function getCostsSummary() {
  return getDb().prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN created_at > datetime('now', '-1 day') THEN tokens_in ELSE 0 END), 0) AS tokens_in_today,
      COALESCE(SUM(CASE WHEN created_at > datetime('now', '-1 day') THEN tokens_out ELSE 0 END), 0) AS tokens_out_today,
      COALESCE(SUM(CASE WHEN created_at > datetime('now', '-1 day') THEN cost_usd ELSE 0 END), 0) AS cost_today,
      COALESCE(SUM(CASE WHEN created_at > datetime('now', '-7 days') THEN tokens_in ELSE 0 END), 0) AS tokens_in_7d,
      COALESCE(SUM(CASE WHEN created_at > datetime('now', '-7 days') THEN tokens_out ELSE 0 END), 0) AS tokens_out_7d,
      COALESCE(SUM(CASE WHEN created_at > datetime('now', '-7 days') THEN cost_usd ELSE 0 END), 0) AS cost_7d,
      COALESCE(SUM(CASE WHEN created_at > datetime('now', '-30 days') THEN tokens_in ELSE 0 END), 0) AS tokens_in_30d,
      COALESCE(SUM(CASE WHEN created_at > datetime('now', '-30 days') THEN tokens_out ELSE 0 END), 0) AS tokens_out_30d,
      COALESCE(SUM(CASE WHEN created_at > datetime('now', '-30 days') THEN cost_usd ELSE 0 END), 0) AS cost_30d,
      COALESCE(SUM(tokens_in), 0) AS tokens_in_all,
      COALESCE(SUM(tokens_out), 0) AS tokens_out_all,
      COALESCE(SUM(cost_usd), 0) AS cost_all
    FROM events
  `).get();
}
```

- [ ] **Step 3: Create links.service.ts**

```typescript
import { getDb } from "./db";

export function getLinksForProject(projectId: string): string[] {
  const rows = getDb().prepare(`SELECT agent_name FROM agent_project_links WHERE project_id = ?`).all(projectId) as { agent_name: string }[];
  return rows.map((r) => r.agent_name);
}

export function linkAgent(agentName: string, projectId: string): void {
  getDb().prepare(`INSERT INTO agent_project_links (agent_name, project_id) VALUES (?, ?) ON CONFLICT DO NOTHING`).run(agentName, projectId);
}

export function unlinkAgent(agentName: string, projectId: string): void {
  getDb().prepare(`DELETE FROM agent_project_links WHERE agent_name = ? AND project_id = ?`).run(agentName, projectId);
}

export function getProjectsForAgent(agentName: string): string[] {
  const rows = getDb().prepare(`SELECT project_id FROM agent_project_links WHERE agent_name = ?`).all(agentName) as { project_id: string }[];
  return rows.map((r) => r.project_id);
}
```

- [ ] **Step 4: Create favorites.service.ts**

```typescript
import { getDb } from "./db";

export type FavoriteItem = {
  item_type: "agent" | "skill" | "hook";
  item_name: string;
};

export function getFavorites(projectId: string): FavoriteItem[] {
  return getDb().prepare(`SELECT item_type, item_name FROM favorites WHERE project_id = ? ORDER BY created_at ASC`).all(projectId) as FavoriteItem[];
}

export function addFavorite(projectId: string, itemType: string, itemName: string): void {
  getDb().prepare(`INSERT INTO favorites (item_type, item_name, project_id) VALUES (?, ?, ?) ON CONFLICT DO NOTHING`).run(itemType, itemName, projectId);
}

export function removeFavorite(projectId: string, itemType: string, itemName: string): void {
  getDb().prepare(`DELETE FROM favorites WHERE item_type = ? AND item_name = ? AND project_id = ?`).run(itemType, itemName, projectId);
}
```

- [ ] **Step 5: Create missions.service.ts**

```typescript
import { getDb } from "./db";

export function createMission(agentName: string, title: string, sessionId?: string) {
  return getDb().prepare(
    `INSERT INTO missions (agent_name, title, session_id) VALUES (?, ?, ?) RETURNING *`
  ).get(agentName, title, sessionId || null);
}

export function getMissions(limit = 50, status?: string) {
  if (status) {
    return getDb().prepare(`SELECT * FROM missions WHERE status = ? ORDER BY started_at DESC LIMIT ?`).all(status, limit);
  }
  return getDb().prepare(`SELECT * FROM missions ORDER BY started_at DESC LIMIT ?`).all(limit);
}

export function getMission(id: number) {
  return getDb().prepare(`SELECT * FROM missions WHERE id = ?`).get(id) || null;
}

export function getMissionEvents(id: number) {
  const mission = getMission(id) as { session_id?: string } | null;
  if (!mission?.session_id) return [];
  return getDb().prepare(`SELECT * FROM events WHERE session_id = ? ORDER BY created_at ASC`).all(mission.session_id);
}

export function failMission(sessionId: string): void {
  getDb().prepare(`UPDATE missions SET status = 'failed', finished_at = datetime('now') WHERE session_id = ? AND status = 'running'`).run(sessionId);
}
```

- [ ] **Step 6: Commit**

```bash
git add electron/services/
git commit -m "feat: adapt all DB services from PostgreSQL to SQLite"
```

### Task 5: Copy and adapt spawn service

**Files:**
- Create: `electron/services/spawn.service.ts`

- [ ] **Step 1: Copy and adapt spawn.service.ts**

Copy `server/src/services/spawn.service.ts` to `electron/services/spawn.service.ts`. Make these changes:

1. Replace `import { broadcast } from "./sse.js"` with `import { broadcast } from "./broadcast"`
2. Replace `import { ingestEvent } from "./events.service.js"` with `import { ingestEvent } from "./events.service"`
3. Replace `import type { SpawnSession, ChatMessage, StreamEvent } from "../types/spawn.types.js"` with `import type { SpawnSession, ChatMessage, StreamEvent } from "../types/spawn.types"`
4. Remove all `.js` extensions from imports

The logic is identical — `child_process.spawn()` works the same in Electron's main process.

- [ ] **Step 2: Commit**

```bash
git add electron/services/spawn.service.ts
git commit -m "feat: adapt spawn service for Electron (broadcast via IPC)"
```

---

## Phase 3: IPC Handlers + Preload

### Task 6: Create all IPC handlers

**Files:**
- Create: `electron/ipc/agents.ipc.ts`
- Create: `electron/ipc/projects.ipc.ts`
- Create: `electron/ipc/spawn.ipc.ts`
- Create: `electron/ipc/events.ipc.ts`
- Create: `electron/ipc/memory.ipc.ts`
- Create: `electron/ipc/costs.ipc.ts`
- Create: `electron/ipc/favorites.ipc.ts`
- Create: `electron/ipc/missions.ipc.ts`
- Create: `electron/ipc/index.ts`

- [ ] **Step 1: Create agents.ipc.ts**

```typescript
import { ipcMain } from "electron";
import * as agentService from "../services/agent.service";

export function registerAgentHandlers(): void {
  ipcMain.handle("agents:list", () => agentService.getAllAgents());
  ipcMain.handle("agents:get", (_e, name: string) => agentService.getAgent(name));
  ipcMain.handle("agents:folders", () => agentService.getFolders());
  ipcMain.handle("agents:create", (_e, payload) => agentService.createAgent(payload));
  ipcMain.handle("agents:update", (_e, name: string, payload) => agentService.updateAgent(name, payload));
  ipcMain.handle("agents:delete", (_e, name: string) => agentService.deleteAgent(name));
  ipcMain.handle("agents:memory:update", (_e, agentName: string, fileName: string, content: string) =>
    agentService.updateMemoryFile(agentName, fileName, content));
  ipcMain.handle("agents:memory:delete", (_e, agentName: string, fileName: string) =>
    agentService.deleteMemoryFile(agentName, fileName));
}
```

- [ ] **Step 2: Create projects.ipc.ts**

```typescript
import { ipcMain } from "electron";
import * as projectService from "../services/project.service";
import * as linksService from "../services/links.service";

export function registerProjectHandlers(): void {
  ipcMain.handle("projects:list", (_e, forceRefresh?: boolean) =>
    projectService.getProjects(forceRefresh));

  ipcMain.handle("projects:get", (_e, id: string) =>
    projectService.getProject(id));

  ipcMain.handle("projects:dashboard", async (_e, projectId: string) => {
    const project = await projectService.getProject(projectId);
    if (!project) return null;

    const [agents, skills, hooks] = await Promise.all([
      projectService.getProjectAgents(projectId),
      projectService.getProjectSkills(projectId),
      projectService.getProjectHooks(projectId),
    ]);

    let linkedAgentNames: string[] = [];
    let userAgents: typeof agents = [];
    let userSkills: typeof skills = [];

    if (projectId !== "user") {
      linkedAgentNames = linksService.getLinksForProject(projectId);
      userAgents = await projectService.getProjectAgents("user");
      userSkills = await projectService.getProjectSkills("user");
    }

    const linkedSet = new Set(linkedAgentNames);
    const taggedUserAgents = userAgents.map((a) => ({
      ...a,
      scope: "user" as const,
      linked: linkedSet.has(a.id),
    }));

    return {
      project,
      agents: [
        ...agents.map((a) => ({ ...a, scope: "project" as const, linked: true })),
        ...taggedUserAgents,
      ],
      skills: [
        ...skills,
        ...userSkills.map((s) => ({ ...s, scope: "user" as const })),
      ],
      hooks,
    };
  });

  ipcMain.handle("links:list", (_e, projectId: string) =>
    linksService.getLinksForProject(projectId));

  ipcMain.handle("links:add", async (_e, agentName: string, projectId: string) => {
    const userAgents = await projectService.getProjectAgents("user");
    const agent = userAgents.find((a) => a.id === agentName);
    linksService.linkAgent(agentName, projectId);
    if (agent && agent.subAgents.length > 0) {
      const existingIds = new Set(userAgents.map((a) => a.id));
      for (const sub of agent.subAgents) {
        if (existingIds.has(sub)) linksService.linkAgent(sub, projectId);
      }
    }
  });

  ipcMain.handle("links:remove", async (_e, agentName: string, projectId: string) => {
    const userAgents = await projectService.getProjectAgents("user");
    const agent = userAgents.find((a) => a.id === agentName);
    linksService.unlinkAgent(agentName, projectId);
    if (agent && agent.subAgents.length > 0) {
      for (const sub of agent.subAgents) {
        linksService.unlinkAgent(sub, projectId);
      }
    }
  });
}
```

- [ ] **Step 3: Create spawn.ipc.ts**

```typescript
import { ipcMain } from "electron";
import * as spawnService from "../services/spawn.service";

export function registerSpawnHandlers(): void {
  ipcMain.handle("spawn:list", () => spawnService.getAllSessions());
  ipcMain.handle("spawn:active", () => spawnService.getActiveSessions());

  ipcMain.handle("spawn:start", (_e, opts: { agent_name?: string; mission: string; cwd?: string; resume_session_id?: string }) => {
    return spawnService.spawnAgent(
      opts.agent_name || "_main",
      opts.mission,
      opts.cwd,
      opts.resume_session_id
    );
  });

  ipcMain.handle("spawn:get", (_e, sessionId: string) =>
    spawnService.getSession(sessionId));

  ipcMain.handle("spawn:input", (_e, sessionId: string, text: string) =>
    spawnService.sendInput(sessionId, text));

  ipcMain.handle("spawn:kill", (_e, sessionId: string) =>
    spawnService.killSession(sessionId));
}
```

- [ ] **Step 4: Create events.ipc.ts**

```typescript
import { ipcMain } from "electron";
import * as eventsService from "../services/events.service";

export function registerEventHandlers(): void {
  ipcMain.handle("events:recent", (_e, limit?: number) =>
    eventsService.getRecentEvents(limit));

  ipcMain.handle("events:by-agent", (_e, agentName: string, limit?: number) =>
    eventsService.getEventsByAgent(agentName, limit));

  ipcMain.handle("events:stats", () => eventsService.getStats());
  ipcMain.handle("events:stats-per-agent", () => eventsService.getStatsPerAgent());

  ipcMain.handle("events:ingest", (_e, event) =>
    eventsService.ingestEvent(event));
}
```

- [ ] **Step 5: Create memory.ipc.ts**

```typescript
import { ipcMain } from "electron";
import * as memoryService from "../services/memory.service";
import * as projectService from "../services/project.service";

export function registerMemoryHandlers(): void {
  ipcMain.handle("memory:list", async (_e, projectId: string) => {
    const project = await projectService.getProject(projectId);
    if (!project) return [];
    return memoryService.getProjectMemory(project.path);
  });

  ipcMain.handle("memory:update", async (_e, projectId: string, fileName: string, content: string) => {
    const project = await projectService.getProject(projectId);
    if (!project) throw new Error("Project not found");
    return memoryService.updateProjectMemoryFile(project.path, fileName, content);
  });

  ipcMain.handle("memory:delete", async (_e, projectId: string, fileName: string) => {
    const project = await projectService.getProject(projectId);
    if (!project) throw new Error("Project not found");
    return memoryService.deleteProjectMemoryFile(project.path, fileName);
  });
}
```

- [ ] **Step 6: Create costs.ipc.ts**

```typescript
import { ipcMain } from "electron";
import * as costsService from "../services/costs.service";

export function registerCostHandlers(): void {
  ipcMain.handle("costs:summary", () => costsService.getCostsSummary());
  ipcMain.handle("costs:by-day", (_e, days?: number) => costsService.getCostsByDay(days));
  ipcMain.handle("costs:by-agent", (_e, days?: number) => costsService.getCostsByAgent(days));
  ipcMain.handle("costs:by-agent-day", (_e, days?: number) => costsService.getCostsByAgentPerDay(days));
  ipcMain.handle("costs:by-tool", (_e, days?: number) => costsService.getCostsByTool(days));
}
```

- [ ] **Step 7: Create favorites.ipc.ts**

```typescript
import { ipcMain } from "electron";
import * as favoritesService from "../services/favorites.service";

export function registerFavoriteHandlers(): void {
  ipcMain.handle("favorites:list", (_e, projectId: string) =>
    favoritesService.getFavorites(projectId));

  ipcMain.handle("favorites:add", (_e, projectId: string, itemType: string, itemName: string) =>
    favoritesService.addFavorite(projectId, itemType, itemName));

  ipcMain.handle("favorites:remove", (_e, projectId: string, itemType: string, itemName: string) =>
    favoritesService.removeFavorite(projectId, itemType, itemName));
}
```

- [ ] **Step 8: Create missions.ipc.ts**

```typescript
import { ipcMain } from "electron";
import * as missionsService from "../services/missions.service";

export function registerMissionHandlers(): void {
  ipcMain.handle("missions:list", (_e, limit?: number, status?: string) =>
    missionsService.getMissions(limit, status));

  ipcMain.handle("missions:get", (_e, id: number) => missionsService.getMission(id));
  ipcMain.handle("missions:events", (_e, id: number) => missionsService.getMissionEvents(id));

  ipcMain.handle("missions:create", (_e, agentName: string, title: string, sessionId?: string) =>
    missionsService.createMission(agentName, title, sessionId));
}
```

- [ ] **Step 9: Create index.ts**

```typescript
import { registerAgentHandlers } from "./agents.ipc";
import { registerProjectHandlers } from "./projects.ipc";
import { registerSpawnHandlers } from "./spawn.ipc";
import { registerEventHandlers } from "./events.ipc";
import { registerMemoryHandlers } from "./memory.ipc";
import { registerCostHandlers } from "./costs.ipc";
import { registerFavoriteHandlers } from "./favorites.ipc";
import { registerMissionHandlers } from "./missions.ipc";

export function registerAllHandlers(): void {
  registerAgentHandlers();
  registerProjectHandlers();
  registerSpawnHandlers();
  registerEventHandlers();
  registerMemoryHandlers();
  registerCostHandlers();
  registerFavoriteHandlers();
  registerMissionHandlers();
}
```

- [ ] **Step 10: Commit**

```bash
git add electron/ipc/
git commit -m "feat: create all IPC handlers replacing Express routes"
```

### Task 7: Create preload and main entry

**Files:**
- Create: `electron/preload.ts`
- Create: `electron/main.ts`

- [ ] **Step 1: Create preload.ts**

```typescript
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  getAgents: () => ipcRenderer.invoke("agents:list"),
  getAgent: (name: string) => ipcRenderer.invoke("agents:get", name),
  getFolders: () => ipcRenderer.invoke("agents:folders"),
  createAgent: (payload: unknown) => ipcRenderer.invoke("agents:create", payload),
  updateAgent: (name: string, payload: unknown) => ipcRenderer.invoke("agents:update", name, payload),
  deleteAgent: (name: string) => ipcRenderer.invoke("agents:delete", name),
  updateMemoryFile: (agentName: string, fileName: string, content: string) =>
    ipcRenderer.invoke("agents:memory:update", agentName, fileName, content),
  deleteMemoryFile: (agentName: string, fileName: string) =>
    ipcRenderer.invoke("agents:memory:delete", agentName, fileName),

  getProjects: (forceRefresh?: boolean) => ipcRenderer.invoke("projects:list", forceRefresh),
  getProject: (id: string) => ipcRenderer.invoke("projects:get", id),
  getDashboard: (id: string) => ipcRenderer.invoke("projects:dashboard", id),

  getLinks: (projectId: string) => ipcRenderer.invoke("links:list", projectId),
  linkAgent: (agentName: string, projectId: string) => ipcRenderer.invoke("links:add", agentName, projectId),
  unlinkAgent: (agentName: string, projectId: string) => ipcRenderer.invoke("links:remove", agentName, projectId),

  spawn: (opts: { agent_name?: string; mission: string; cwd?: string; resume_session_id?: string }) =>
    ipcRenderer.invoke("spawn:start", opts),
  getSession: (sessionId: string) => ipcRenderer.invoke("spawn:get", sessionId),
  sendInput: (sessionId: string, text: string) => ipcRenderer.invoke("spawn:input", sessionId, text),
  killSession: (sessionId: string) => ipcRenderer.invoke("spawn:kill", sessionId),
  getSessions: () => ipcRenderer.invoke("spawn:list"),

  getRecentEvents: (limit?: number) => ipcRenderer.invoke("events:recent", limit),
  getEventsByAgent: (name: string, limit?: number) => ipcRenderer.invoke("events:by-agent", name, limit),
  getStats: () => ipcRenderer.invoke("events:stats"),

  getProjectMemory: (projectId: string) => ipcRenderer.invoke("memory:list", projectId),
  updateProjectMemoryFile: (projectId: string, fileName: string, content: string) =>
    ipcRenderer.invoke("memory:update", projectId, fileName, content),
  deleteProjectMemoryFile: (projectId: string, fileName: string) =>
    ipcRenderer.invoke("memory:delete", projectId, fileName),

  getCostsSummary: () => ipcRenderer.invoke("costs:summary"),
  getCostsByDay: (days?: number) => ipcRenderer.invoke("costs:by-day", days),
  getCostsByAgent: (days?: number) => ipcRenderer.invoke("costs:by-agent", days),
  getCostsByAgentPerDay: (days?: number) => ipcRenderer.invoke("costs:by-agent-day", days),
  getCostsByTool: (days?: number) => ipcRenderer.invoke("costs:by-tool", days),

  getFavorites: (projectId: string) => ipcRenderer.invoke("favorites:list", projectId),
  addFavorite: (projectId: string, type: string, name: string) =>
    ipcRenderer.invoke("favorites:add", projectId, type, name),
  removeFavorite: (projectId: string, type: string, name: string) =>
    ipcRenderer.invoke("favorites:remove", projectId, type, name),

  onEvent: (cb: (data: unknown) => void) => {
    const handler = (_e: unknown, data: unknown) => cb(data);
    ipcRenderer.on("push-event", handler);
    return () => { ipcRenderer.removeListener("push-event", handler); };
  },
});
```

- [ ] **Step 2: Create main.ts**

```typescript
import { app, BrowserWindow } from "electron";
import path from "path";
import { initDb } from "./services/db";
import { registerAllHandlers } from "./ipc";

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#030712",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  initDb();
  registerAllHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add electron/main.ts electron/preload.ts
git commit -m "feat: create Electron main entry and preload with contextBridge"
```

---

## Phase 4: Migrate Renderer

### Task 8: Move React source and create index.html

**Files:**
- Move: `client/src/*` → `src/`
- Create: `src/index.html`
- Create: `src/env.d.ts`

- [ ] **Step 1: Copy React source**

```bash
cp -r client/src/* src/
```

Note: `src/` may already contain some files from the scaffold. Overwrite.

- [ ] **Step 2: Move Tailwind/PostCSS config**

```bash
cp client/tailwind.config.js tailwind.config.js 2>/dev/null || true
cp client/postcss.config.js postcss.config.js 2>/dev/null || true
cp client/src/index.css src/index.css 2>/dev/null || true
```

- [ ] **Step 3: Create src/index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Agent Manager</title>
    <style>html, body, #root { height: 100%; margin: 0; }</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create src/env.d.ts**

```typescript
interface Window {
  api: {
    getAgents: () => Promise<import("./types/agent.types").AgentFile[]>;
    getAgent: (name: string) => Promise<import("./types/agent.types").AgentFile | null>;
    getFolders: () => Promise<string[]>;
    createAgent: (payload: unknown) => Promise<import("./types/agent.types").AgentFile>;
    updateAgent: (name: string, payload: unknown) => Promise<import("./types/agent.types").AgentFile>;
    deleteAgent: (name: string) => Promise<void>;
    updateMemoryFile: (agentName: string, fileName: string, content: string) => Promise<unknown>;
    deleteMemoryFile: (agentName: string, fileName: string) => Promise<void>;

    getProjects: (forceRefresh?: boolean) => Promise<unknown[]>;
    getProject: (id: string) => Promise<unknown>;
    getDashboard: (id: string) => Promise<unknown>;

    getLinks: (projectId: string) => Promise<string[]>;
    linkAgent: (agentName: string, projectId: string) => Promise<void>;
    unlinkAgent: (agentName: string, projectId: string) => Promise<void>;

    spawn: (opts: { agent_name?: string; mission: string; cwd?: string; resume_session_id?: string }) => Promise<unknown>;
    getSession: (sessionId: string) => Promise<unknown>;
    sendInput: (sessionId: string, text: string) => Promise<boolean>;
    killSession: (sessionId: string) => Promise<boolean>;
    getSessions: () => Promise<unknown[]>;

    getRecentEvents: (limit?: number) => Promise<unknown[]>;
    getEventsByAgent: (name: string, limit?: number) => Promise<unknown[]>;
    getStats: () => Promise<unknown>;

    getProjectMemory: (projectId: string) => Promise<unknown[]>;
    updateProjectMemoryFile: (projectId: string, fileName: string, content: string) => Promise<unknown>;
    deleteProjectMemoryFile: (projectId: string, fileName: string) => Promise<void>;

    getCostsSummary: () => Promise<unknown>;
    getCostsByDay: (days?: number) => Promise<unknown[]>;
    getCostsByAgent: (days?: number) => Promise<unknown[]>;
    getCostsByAgentPerDay: (days?: number) => Promise<unknown[]>;
    getCostsByTool: (days?: number) => Promise<unknown[]>;

    getFavorites: (projectId: string) => Promise<unknown[]>;
    addFavorite: (projectId: string, type: string, name: string) => Promise<void>;
    removeFavorite: (projectId: string, type: string, name: string) => Promise<void>;

    onEvent: (cb: (data: unknown) => void) => () => void;
  };
}
```

- [ ] **Step 5: Commit**

```bash
git add src/ tailwind.config.js postcss.config.js
git commit -m "feat: move React renderer to src/ with index.html and type declarations"
```

### Task 9: Adapt api.ts (fetch → window.api)

**Files:**
- Modify: `src/services/api.ts`

- [ ] **Step 1: Rewrite api.ts**

Replace the entire file:

```typescript
import type { AgentFile } from "../types/agent.types";

export const api = {
  getAgents: (): Promise<AgentFile[]> => window.api.getAgents(),
  getAgent: (name: string): Promise<AgentFile | null> => window.api.getAgent(name),
  getFolders: (): Promise<string[]> => window.api.getFolders(),

  createAgent: (payload: {
    folder: string;
    fileName: string;
    frontmatter: Record<string, unknown>;
    body: string;
  }): Promise<AgentFile> => window.api.createAgent(payload),

  updateAgent: (name: string, payload: { frontmatter?: Record<string, unknown>; body?: string }): Promise<AgentFile> =>
    window.api.updateAgent(name, payload),

  deleteAgent: (name: string): Promise<void> => window.api.deleteAgent(name),

  updateMemoryFile: (agentName: string, fileName: string, content: string) =>
    window.api.updateMemoryFile(agentName, fileName, content),

  deleteMemoryFile: (agentName: string, fileName: string): Promise<void> =>
    window.api.deleteMemoryFile(agentName, fileName),

  getProjectMemory: (projectId: string) => window.api.getProjectMemory(projectId),
  updateProjectMemoryFile: (projectId: string, fileName: string, content: string) =>
    window.api.updateProjectMemoryFile(projectId, fileName, content),
  deleteProjectMemoryFile: (projectId: string, fileName: string): Promise<void> =>
    window.api.deleteProjectMemoryFile(projectId, fileName),
};
```

- [ ] **Step 2: Commit**

```bash
git add src/services/api.ts
git commit -m "feat: rewrite api.ts to use window.api IPC instead of fetch"
```

### Task 10: Replace useSSE with useIPC

**Files:**
- Create: `src/hooks/useIPC.ts`
- Modify: `src/App.tsx` (import useIPC instead of useSSE)

- [ ] **Step 1: Create useIPC.ts**

```typescript
import { useState, useEffect, useRef, useCallback } from "react";

export type LiveEvent = {
  id: number;
  agent_name: string;
  session_id: string | null;
  event_type: string;
  tool_name: string | null;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  created_at: string;
};

export type AgentContext = {
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  percent: number;
};

const DEFAULT_LIMIT = 200_000;

export function useIPC() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [activeAgents, setActiveAgents] = useState<Set<string>>(new Set());
  const [agentContexts, setAgentContexts] = useState<Map<string, AgentContext>>(new Map());
  const [currentTools, setCurrentTools] = useState<Map<string, string>>(new Map());
  const activeTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const markActive = useCallback((agentName: string, tokensIn: number, tokensOut: number, costUsd: number, toolName?: string) => {
    setActiveAgents((prev) => new Set(prev).add(agentName));

    if (tokensIn > 0 || tokensOut > 0) {
      setAgentContexts((prev) => {
        const next = new Map(prev);
        const existing = next.get(agentName) || { tokensIn: 0, tokensOut: 0, costUsd: 0, percent: 0 };
        const newIn = existing.tokensIn + tokensIn;
        const newOut = existing.tokensOut + tokensOut;
        const total = newIn + newOut;
        next.set(agentName, {
          tokensIn: newIn,
          tokensOut: newOut,
          costUsd: existing.costUsd + costUsd,
          percent: Math.min((total / DEFAULT_LIMIT) * 100, 100),
        });
        return next;
      });
    }

    if (toolName) {
      setCurrentTools((prev) => {
        const next = new Map(prev);
        next.set(agentName, toolName);
        return next;
      });
    }

    const existing = activeTimers.current.get(agentName);
    if (existing) clearTimeout(existing);

    activeTimers.current.set(
      agentName,
      setTimeout(() => {
        setActiveAgents((prev) => {
          const next = new Set(prev);
          next.delete(agentName);
          return next;
        });
        setCurrentTools((prev) => {
          const next = new Map(prev);
          next.delete(agentName);
          return next;
        });
        activeTimers.current.delete(agentName);
      }, 5000)
    );
  }, []);

  useEffect(() => {
    setConnected(true);

    const cleanup = window.api.onEvent((data: any) => {
      if (data.type === "event") {
        const event: LiveEvent = data;
        setEvents((prev) => [event, ...prev].slice(0, 200));
        markActive(event.agent_name, event.tokens_in || 0, event.tokens_out || 0, event.cost_usd || 0, event.tool_name || undefined);
      }
      if (data.type === "spawn_usage") {
        markActive(data.agentName, data.tokensIn || 0, data.tokensOut || 0, 0);
      }
    });

    return cleanup;
  }, [markActive]);

  return { events, connected, activeAgents, agentContexts, currentTools };
}
```

- [ ] **Step 2: Update App.tsx import**

In `src/App.tsx`, change:

```typescript
import { useSSE } from "./hooks/useSSE";
```
to:
```typescript
import { useIPC } from "./hooks/useIPC";
```

And change:
```typescript
const { events, connected, activeAgents, agentContexts, currentTools } = useSSE();
```
to:
```typescript
const { events, connected, activeAgents, agentContexts, currentTools } = useIPC();
```

- [ ] **Step 3: Delete useSSE.ts**

```bash
rm src/hooks/useSSE.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useIPC.ts src/App.tsx
git rm src/hooks/useSSE.ts
git commit -m "feat: replace useSSE with useIPC for Electron event handling"
```

### Task 11: Adapt hooks and components that use fetch directly

**Files:**
- Modify: `src/hooks/useProjects.ts`
- Modify: `src/hooks/useFavorites.ts`
- Modify: `src/hooks/useStats.ts`
- Modify: `src/components/ProjectDashboard.tsx`
- Modify: `src/components/AgentChat.tsx`
- Modify: `src/components/CostDashboard.tsx`

- [ ] **Step 1: Adapt useProjects.ts**

Replace `fetch("/api/projects")` with `window.api.getProjects()` and `fetch(\`/api/projects/${projectId}/dashboard\`)` with `window.api.getDashboard(projectId)`:

```typescript
import { useState, useEffect, useCallback } from "react";

// ... keep existing type exports (Project, SkillFile, etc.) ...

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await window.api.getProjects();
    setProjects(data as Project[]);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { projects, loading, refresh };
}

export function useDashboard(projectId: string | null) {
  const [dashboard, setDashboard] = useState<{
    project: Project;
    agents: any[];
    skills: SkillFile[];
    hooks: HookConfig[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const data = await window.api.getDashboard(projectId);
    setDashboard(data as any);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { dashboard, loading, refresh };
}
```

- [ ] **Step 2: Adapt useFavorites.ts**

Replace all `fetch("/api/favorites/...")` calls with `window.api.getFavorites()`, `window.api.addFavorite()`, `window.api.removeFavorite()`:

```typescript
import { useState, useEffect, useCallback } from "react";

export type FavoriteItem = {
  item_type: "agent" | "skill" | "hook";
  item_name: string;
};

export function useFavorites(projectId: string | null) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  const refresh = useCallback(async () => {
    if (!projectId) return;
    const data = await window.api.getFavorites(projectId);
    setFavorites(data as FavoriteItem[]);
  }, [projectId]);

  useEffect(() => { refresh(); }, [refresh]);

  const isFavorite = useCallback(
    (type: string, name: string) => favorites.some((f) => f.item_type === type && f.item_name === name),
    [favorites]
  );

  const toggle = useCallback(
    async (type: string, name: string) => {
      if (!projectId) return;
      if (isFavorite(type, name)) {
        await window.api.removeFavorite(projectId, type, name);
      } else {
        await window.api.addFavorite(projectId, type, name);
      }
      await refresh();
    },
    [projectId, isFavorite, refresh]
  );

  return { favorites, isFavorite, toggle, refresh };
}
```

- [ ] **Step 3: Adapt useStats.ts**

If `useStats` fetches from `/api/events/stats`, change to `window.api.getStats()`. Read the file first to confirm — it may only derive stats from event count (in which case no change needed).

- [ ] **Step 4: Adapt ProjectDashboard.tsx**

Replace the two `fetch` calls in `handleToggleLink`:

```typescript
  const handleToggleLink = async (agentName: string, currentlyLinked: boolean) => {
    if (currentlyLinked) {
      await window.api.unlinkAgent(agentName, project.id);
    } else {
      await window.api.linkAgent(agentName, project.id);
    }
    onRefresh();
  };
```

And in `handleAgentAction` for delete:

```typescript
      case "delete":
        if (confirm(`Delete agent "${agentName}"?`)) {
          window.api.deleteAgent(agentName).then(() => onRefresh());
        }
        break;
```

- [ ] **Step 5: Adapt AgentChat.tsx**

This is the most complex change. Replace all `fetch("/api/spawn", ...)` calls with `window.api.spawn(...)`, `fetch(\`/api/spawn/${session.id}/input\`, ...)` with `window.api.sendInput(...)`, `fetch(\`/api/spawn/${session.id}\`, { method: "DELETE" })` with `window.api.killSession(...)`.

Replace the EventSource-based SSE listener with `window.api.onEvent()`:

```typescript
  useEffect(() => {
    const cleanup = window.api.onEvent((data: any) => {
      const s = sessionRef.current;
      if (data.type === "spawn_message" && s && data.sessionId === s.id) {
        const msg: ChatMessage = data.message;
        if (msg.role === "user" && pendingUserMsgs.current.has(msg.content)) {
          pendingUserMsgs.current.delete(msg.content);
          return;
        }
        setMessages((prev) => [...prev, msg]);
        setWaitingInput(false);
        if (msg.role === "assistant") {
          setAwaitingResponse(false);
          setTimeout(() => sendNextFromQueue(), 100);
        }
      }
      if (data.type === "spawn_input_request" && s && data.sessionId === s.id) {
        setWaitingInput(true);
        setAwaitingResponse(false);
        setTimeout(() => sendNextFromQueue(), 100);
      }
      if (data.type === "spawn_claude_session" && s && data.sessionId === s.id) {
        setClaudeSessionId(data.claudeSessionId);
      }
      if (data.type === "spawn_exit" && s && data.sessionId === s.id) {
        setSession((prev) => prev ? { ...prev, status: data.status } : null);
        if (data.claudeSessionId) setClaudeSessionId(data.claudeSessionId);
        setWaitingInput(false);
        setAwaitingResponse(false);
      }
    });
    return cleanup;
  }, [sendNextFromQueue]);
```

Replace spawn fetch calls:

```typescript
    // Instead of: fetch("/api/spawn", { method: "POST", ... }).then(...)
    // Use:
    const data = await window.api.spawn({ agent_name: agentName, mission: text, cwd: projectPath, resume_session_id: claudeSessionId });
    setSession(data as SpawnSession);

    // Instead of: fetch(`/api/spawn/${session.id}/input`, { method: "POST", ... })
    // Use:
    await window.api.sendInput(session.id, text);

    // Instead of: fetch(`/api/spawn/${session.id}`, { method: "DELETE" })
    // Use:
    await window.api.killSession(session.id);
```

- [ ] **Step 6: Adapt CostDashboard.tsx**

Replace all `fetch("/api/costs/...")` calls with `window.api.getCostsByDay()`, `window.api.getCostsByAgent()`, `window.api.getCostsByTool()`, `window.api.getCostsSummary()`, `window.api.getCostsByAgentPerDay()`.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/ src/components/ src/services/
git commit -m "feat: adapt all renderer hooks and components from fetch to window.api"
```

---

## Phase 5: Clean Up and Verify

### Task 12: Remove old server, client, and Docker files

**Files:**
- Delete: `server/` (entire directory)
- Delete: `client/` (entire directory)
- Delete: `docker-compose.yml`
- Delete: `start.sh`

- [ ] **Step 1: Delete old directories and files**

```bash
rm -rf server/ client/ docker-compose.yml start.sh
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove server/, client/, Docker files (migrated to Electron)"
```

### Task 13: Build and verify

- [ ] **Step 1: Install native deps for Electron**

```bash
npx electron-rebuild
```

This rebuilds `better-sqlite3` for Electron's Node version.

- [ ] **Step 2: Run in dev mode**

```bash
npm run dev
```

This should launch the Electron app with HMR. Verify:

1. Window opens with dark theme
2. Project grid shows on home screen
3. Select a project → dashboard loads with agents in sidebar
4. Scope tabs (Project/User) work
5. Tree tab shows agent hierarchy
6. Click an agent → detail view with Overview, Chat, Prompt, Memory, Files tabs
7. Memory tab shows MemoryManager with size gauges
8. Cost tab loads charts
9. Chat button opens GlobalChatModal
10. Start a chat session → messages stream in

- [ ] **Step 3: Fix TypeScript errors**

```bash
npx electron-vite build 2>&1
```

Fix any errors found.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: fix build issues from Electron migration"
```

---

## Summary

| Phase | Tasks | What it produces |
|-------|-------|-----------------|
| 1: Scaffold | Task 1 | Working electron-vite project with deps |
| 2: Main process | Tasks 2-5 | SQLite DB, all services, broadcast |
| 3: IPC + Preload | Tasks 6-7 | All IPC handlers, contextBridge, main entry |
| 4: Renderer | Tasks 8-11 | React app using window.api instead of fetch |
| 5: Cleanup | Tasks 12-13 | Remove old code, verify everything works |
