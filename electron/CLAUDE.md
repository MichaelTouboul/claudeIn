# electron/ — Main process (the "back")

Auto-loaded when working in `electron/`. The root `CLAUDE.md` (architecture, commands, transversal rules) still applies on top of this.

This is the **privileged** side of the app: full Node access (filesystem, child processes, SQLite). The renderer (`src/`) can do **none** of this — it can only ask the main process via IPC. Everything that touches the disk, the DB, or spawns a process lives here.

## Layout

- **`main.ts`** — app entry, `BrowserWindow` lifecycle.
- **`preload.ts`** — `contextBridge` that exposes `window.api` to the renderer. This is the **public surface** of the back.
- **`ipc/`** — IPC handlers, **one file per domain** (`agents.ipc.ts`, `projects.ipc.ts`, `spawn.ipc.ts`, `sessions.ipc.ts`, `events.ipc.ts`, `costs.ipc.ts`, `memory.ipc.ts`, `favorites.ipc.ts`, `missions.ipc.ts`, `dialog.ipc.ts`); registered via `ipc/index.ts`. Think of these as your controllers/routes.
- **`services/`** — business logic (`db.ts`, `agent.service.ts`, `project.service.ts`, `session.service.ts`, `spawn.service.ts`, `broadcast.ts`, …). IPC handlers stay thin and delegate here.
- **`types/`** — types shared with the renderer.

## IPC conventions

- Channel naming is **`domain:action`** (e.g. `sessions:list`, `agents:update`). Match the domain to the `*.ipc.ts` filename.
- An `ipc/` handler is a thin adapter: validate args, call a `service`, return a serializable result. Put real logic in `services/`.
- Push-style events to the renderer go through `services/broadcast.ts` (e.g. live agent output), not by returning from a handler.

## Adding a new IPC method (the full loop)

A new capability is only "done" when all three layers agree:
1. **`services/`** — implement the actual logic.
2. **`ipc/<domain>.ipc.ts`** — register `ipcMain.handle("<domain>:<action>", …)` calling the service.
3. **`preload.ts`** — expose a matching `window.api.<method>` that `invoke`s that channel.
4. **`src/env.d.ts`** — add the TypeScript signature to the `window.api` interface (this is the renderer-facing contract; without it the front can't see the method type-safely).

If you add a handler but skip preload or `env.d.ts`, the front cannot reach it. Keep the four in sync.

## Database

- `services/db.ts` uses **sql.js** (WASM SQLite), persisted at `~/.claude-agent-manager/data.db`. Local file only — no network DB, no Docker.
- **sql.js is synchronous** — wrap DB calls in `try/catch`, never `.catch()` / `.then()`.

## Hard rules

- **No `fetch()` here for app data** — the main process is the data source, not a client of one.
- **Named imports only** (no default exports).
- **300-line hard limit** per file; **0 ESLint errors AND 0 warnings** before a diff lands (see root `CLAUDE.md`).
