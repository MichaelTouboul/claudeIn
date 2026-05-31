# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

An Electron desktop app: a manager and dashboard for Claude Code agents. It scans the local machine for projects with `.claude/` directories, reads their agent `.md` files (with gray-matter frontmatter), and presents a UI to browse, edit, spawn, and track agents. Events from running agents are stored in a local SQLite database (via sql.js/WASM).

## Commands

```bash
npm run dev        # electron-vite dev (main + renderer with HMR)
npm run build      # electron-vite build
npm run package    # electron-builder (distributable)
npm run lint       # eslint src
npm run lint:fix   # eslint src --fix
npm run typecheck  # tsc --noEmit -p tsconfig.web.json
```

Build check used in agent verification: `npx electron-vite build`

## Architecture

Two process boundaries in Electron:

### Main process — `electron/`

- **`electron/main.ts`** — app entry, BrowserWindow lifecycle
- **`electron/preload.ts`** — `contextBridge` that exposes `window.api` to the renderer
- **`electron/ipc/`** — IPC handlers, one file per domain (`agents.ipc.ts`, `projects.ipc.ts`, `spawn.ipc.ts`, `sessions.ipc.ts`, `events.ipc.ts`, `costs.ipc.ts`, `memory.ipc.ts`, `favorites.ipc.ts`, `missions.ipc.ts`); registered via `ipc/index.ts`
- **`electron/services/`** — business logic (`db.ts` for sql.js WASM SQLite, `agent.service.ts`, `project.service.ts`, `session.service.ts`, `spawn.service.ts`, `broadcast.ts`, …)
- **`electron/types/`** — types shared with the renderer

### Renderer — `src/`

- **`src/App.tsx`** — root component
- **`src/components/`** — UI components; feature components live at the root, generic primitives in `src/components/_ui/`
- **`src/hooks/`** — `useIPC.ts`, `useSessions.ts`, `useProjects.ts`, `useFavorites.ts`, etc.
- **`src/services/api.ts`** — thin wrapper over `window.api`
- **`src/store/useAppStore.ts`** — global state with zustand
- **`src/env.d.ts`** — TypeScript declaration of `window.api` (the IPC contract)
- **`src/index.css`** — design system CSS custom properties
- **`src/lib/cn.ts`** — `cn()` utility (`clsx` + `tailwind-merge`)

### IPC contract

The full `window.api` surface is declared in `src/env.d.ts`. All renderer ↔ main communication goes through this interface — **no `fetch()`, no direct Node access in the renderer**. IPC channel naming convention: `domain:action` (e.g. `sessions:list`, `agents:update`).

### Database

`electron/services/db.ts` uses **sql.js** (WASM SQLite). Persisted at `~/.claude-agent-manager/data.db`. Local file only — no network database, no Docker dependency.

## Key Conventions

Everything below applies to **both** sides (front and back). Side-specific rules live in `electron/CLAUDE.md` and `src/CLAUDE.md`.

- **Path alias:** `@/` → `src/`. Always import via `@/…`; never use `../../../` beyond one level up.

### TypeScript

Everything is typed. **No `any`** (`@typescript-eslint/no-explicit-any: error`). Don't create type aliases that just rename an existing type — reuse the source type.

Choosing the right construct:
- **`interface`** — object shapes that may be extended or implemented.
- **`type`** — unions, intersections, mapped/conditional types, function signatures.
- **`Record<K, V>`** — object maps (`Record<AgentId, Agent>`), never `{ [key: string]: Agent }`.
- **Inline literal union** (`'valid' | 'invalid'`) — finite string sets used in 1–2 places. No enum.
- **`enum`** — only when **both**: values used in **3+ files** AND you need a runtime object to iterate (e.g. `Object.values(...)` for select options). Otherwise use an `as const` object:
  ```ts
  export const AgentStatus = { Active: 'active', Idle: 'idle', Stopped: 'stopped' } as const;
  export type AgentStatus = (typeof AgentStatus)[keyof typeof AgentStatus];
  ```

Shared types go in a `types/` folder with a barrel `index.ts`. File naming by kind:
- `*.interface.ts` — `interface` declarations
- `*.type.ts` — `type` aliases
- `*.enum.ts` — `enum` declarations

### Imports

- **Named imports only** — no default exports except `src/App.tsx` and `src/main.tsx`.
- **React:** `import { useEffect } from 'react'`. **Never** `import * as React from 'react'`, never `import React from 'react'` (the JSX transform handles it).
- Prefer `import type { … }` for type-only imports; use inline `type` for mixed imports (`import { spawn, type SpawnOptions } from 'node:child_process'`).
- **No file extensions** in import paths (`@/lib/cn`, not `@/lib/cn.ts`).
- Import **ordering/grouping is handled by the formatter plugin** — don't hand-manage it.

### File size — 300-line hard limit

**No file may exceed 300 lines** (`.tsx`, `.ts`, `.css`). Enforced by ESLint `max-lines: error` — non-negotiable.

When a file approaches the limit, split it (in order of preference):
1. Extract a logical unit into its own module (front: a sub-component; back: a sub-service).
2. Extract pure helpers into a sibling file (e.g. `utils.ts`).
3. Extract local types into a sibling file (e.g. `types.ts`).

If the file you're about to write would exceed 300 lines, **STOP and split first** — never write the oversized file.

### Linting policy

**0 errors AND 0 warnings** before any diff lands (`eslint.config.mjs`, flat config). `error` blocks the build; `warn` is still a defect — both are the same standard.

```bash
npm run lint       # must report 0 errors AND 0 warnings
npm run lint:fix   # auto-fix what's mechanically fixable
npm run typecheck  # tsc --noEmit — 0 errors
```

A `warn` means **stop and think before fixing** (e.g. `react-hooks/exhaustive-deps`), not "ignore". When a rule fires:
1. **Fix the code first** — most signals point at a real issue.
2. If the rule is a genuinely bad fit for the project, fix it **globally in `eslint.config.mjs`** (turn `off` or downgrade to `warn`) — not per-file.
3. **Inline `// eslint-disable` is forbidden** unless explicitly approved for a single callsite with a documented reason. `reportUnusedDisableDirectives: error` fails the build on stale disables.

## Scoped conventions

Detailed conventions live next to the code and load automatically when you work there:

- **`electron/CLAUDE.md`** — main process ("back"): IPC handlers, services, sql.js, how to add a `window.api` method.
- **`src/CLAUDE.md`** — renderer ("front"): design system, `_ui/` primitives, **state management** (props/context/zustand), React patterns.

This root file holds only what is transversal to both sides.
