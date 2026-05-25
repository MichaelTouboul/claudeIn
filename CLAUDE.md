# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A dashboard for managing and monitoring Claude Code agents. It scans the local machine for projects with `.claude/` directories, reads their agent `.md` files (with gray-matter frontmatter), and presents a UI to browse, edit, spawn, and track agents across projects. Events from running agents are ingested via a shell hook and stored in PostgreSQL.

## Commands

```bash
# Full stack dev (PostgreSQL + server + client + open browser)
npm start

# Or run pieces individually
npm run dev           # server + client concurrent (needs PG already running)
npm run dev:server    # tsx watch on port 3456
npm run dev:client    # vite on port 5173

# Build
npm run build
```

No test suite exists yet. No linter is configured.

## Infrastructure

- **PostgreSQL**: runs via `docker-compose.yml` on port **5433** (5432 is occupied). Container name: `agent-manager-db`. Data persisted in a Docker volume `pgdata`.
- **`start.sh`**: one-command dev launcher — starts PostgreSQL (waits for healthcheck), installs deps if needed, starts server (`tsx watch`) and client (Vite HMR), opens browser. `Ctrl+C` tears everything down cleanly.

## Architecture

Monorepo with npm workspaces: `server/` and `client/`.

### Server (Express + PostgreSQL)

- **Entry**: `server/src/index.ts` — Express on port 3456 (or `PORT` env)
- **Database**: PostgreSQL via `pg` pool. Connection: `localhost:5433` (via `PG_PORT` env), user/pass `tastewise/tastewise`, database `agent_manager`. Tables auto-created in `initDb()`: `events`, `missions`, `agent_project_links`
- **Routes** (all under `/api`):
  - `/agents` — CRUD for agent `.md` files on disk (`~/.claude/agents/`)
  - `/projects` — scans `$HOME` (depth 3) for directories containing `.claude/`, returns dashboard data (agents, skills, hooks)
  - `/projects/:id/dashboard` — aggregated view merging project-scope + user-scope agents/skills, with link status
  - `/events` — event ingestion, querying, SSE stream at `/events/stream`
  - `/hooks` — receives POST from the shell hook script
  - `/spawn` — spawns `claude` CLI as a child process with `--print --output-format stream-json`, manages sessions in-memory
  - `/missions` — mission lifecycle tied to sessions
  - `/costs` — cost analytics by day/agent/tool
- **SSE**: `services/sse.ts` — broadcasts events to all connected clients in real-time
- **Agent files**: parsed from `~/.claude/agents/` using `gray-matter`. Each agent has frontmatter (`name`, `description`, `model`, `color`, `tools`, etc.), a markdown body, optional `memory/` subdirectory, and annex files (including `.env`)
- **Spawn service**: runs `claude --print --output-format stream-json --agent <name>` as a child process, parses the streaming JSON output, and forwards messages via SSE

### Client (React + Vite + Tailwind)

- **Entry**: `client/src/main.tsx` → `App.tsx`
- **Vite** proxies `/api` to `localhost:3456`
- **Path alias**: `@/` maps to `client/src/`
- **Key components**:
  - `ProjectSwitcher` / `ProjectDashboard` — project selection and main dashboard
  - `AgentDetail` / `AgentForm` / `AgentContextMenu` — agent viewing/editing
  - `AgentGraph` / `AgentMesh` — visualize agent relationships (@xyflow/react, react-force-graph-2d)
  - `EventConsole` — live SSE event feed
  - `CostDashboard` — cost analytics with recharts
  - `ChatPanel` — interactive chat with spawned agents
  - `MemoryViewer` — view/edit agent memory files
- **Hooks**: `useSSE` (EventSource to `/api/events/stream`), `useAgents`, `useProjects`, `useStats`
- **Styling**: Tailwind CSS 3, dark theme (gray-950 background)

### Data Flow

1. Claude Code hook (`server/src/hooks/post-event.sh`) POSTs events to `/api/hooks/event`
2. Server ingests to PostgreSQL `events` table, updates related `missions` row
3. Server broadcasts via SSE to all connected clients
4. Client `useSSE` hook receives and displays in `EventConsole`

### Project Scanning

`project.service.ts` walks `$HOME` up to 3 levels deep looking for `.claude/` directories. Each found directory becomes a "project". The special "User Scope" project represents `~/.claude/` itself. Projects are cached for 60 seconds.

### Agent-Project Links

User-scope agents (from `~/.claude/agents/`) can be "linked" to specific projects via the `agent_project_links` table. Linking an agent also auto-links its sub-agents (detected by backtick-quoted `tw-*` patterns in the agent body).

## Key Conventions

- Server imports use `.js` extensions (TypeScript with ESM-style resolution via bundler moduleResolution)
- Agent identity is the `name` field from frontmatter, used as the primary key everywhere
- Types are shared by convention (duplicate files in `server/src/types/` and `client/src/types/`), not via a shared package
- No ORM — raw SQL queries via `pg` pool
