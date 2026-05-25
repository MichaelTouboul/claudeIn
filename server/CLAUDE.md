# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # tsx watch src/index.ts (hot-reload)
npm run build     # tsc → dist/
npm run start     # node dist/index.js
```

Requires PostgreSQL running first — use `./start.sh` from root or `docker compose up -d --wait` from root. No test suite or linter configured.

## Architecture

Express API on port 3456 (or `PORT` env). PostgreSQL for persistence, SSE for real-time push.

### Database

PostgreSQL via raw `pg` pool — no ORM. Connection in `services/db.ts`: `localhost`, port from `PG_PORT` env (default `5432`, set to **5433** by `start.sh`), user/pass `tastewise/tastewise`, database `agent_manager`. Runs in Docker via root `docker-compose.yml`.

Three tables, auto-created by `initDb()`:

- **events** — every agent hook event (agent_name, session_id, event_type, tool_name, payload JSONB, token counts, cost)
- **missions** — agent mission lifecycle (status: running/done/failed, aggregated token/cost totals, linked by session_id)
- **agent_project_links** — many-to-many between user-scope agents and projects (unique on agent_name + project_id)

### Route → Service mapping

| Route prefix | Service | Purpose |
|---|---|---|
| `/api/agents` | `agent.service` | CRUD for agent `.md` files on disk |
| `/api/projects` | `project.service` + `links.service` | Scan machine for projects, dashboard aggregation, agent-project linking |
| `/api/events` | `events.service` + `sse` | Event ingestion, querying, SSE stream (`/stream`) |
| `/api/hooks` | `events.service` | Receives POST from shell hook |
| `/api/spawn` | `spawn.service` | Spawn `claude` CLI as child process, manage sessions |
| `/api/missions` | `missions.service` | Mission lifecycle |
| `/api/costs` | `costs.service` | Cost analytics (by day/agent/tool) |
| `/api/health` | inline | Health check with SSE client count |

### Agent File System

`agent.service.ts` reads/writes agent markdown files from `~/.claude/agents/`. Each file is parsed with `gray-matter`:

- **Frontmatter**: `name` (primary key), `description`, `model`, `color`, `tools`, `maxTurns`, `memory`, `permissionMode`, `skills`, `mcpServers`, etc.
- **Body**: markdown prompt
- **Memory**: optional `memory/` subdirectory next to the agent file
- **Annex files**: any non-`.md` file in the agent's directory (including `.env`)
- **Sub-agents**: extracted from backtick-quoted `` `tw-*` `` patterns in the body

### Project Scanning

`project.service.ts` walks `$HOME` up to depth 3, looking for `.claude/` directories. Each becomes a project. The "User Scope" project is `~/.claude/` itself. Results cached 60s. The `/dashboard` endpoint merges project-scope and user-scope agents/skills with link status.

### Spawn Service

`spawn.service.ts` runs `claude --print --output-format stream-json --verbose --max-turns 50 [--agent <name>] <mission>` as a child process. Parses streaming JSON from stdout, forwards messages via SSE broadcast, ingests tool-use events into the database. Sessions stored in-memory (`Map<sessionId, {session, process}>`).

### SSE

`services/sse.ts` maintains a `Set<Response>` of connected clients. `broadcast()` writes `data: JSON\n\n` to all. Used by event ingestion and spawn service.

## Conventions

- All imports use `.js` extensions (TypeScript ESM-style with bundler moduleResolution)
- Agent identity = `name` field from frontmatter, used as key everywhere
- No request validation library — manual checks in route handlers
- Errors returned as `{ error: string }` with appropriate HTTP status
- Types in `src/types/` — duplicated (by convention) with client, not shared via package
