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

- **Path alias:** `@/` → `src/`
- **Tailwind CSS 4** + PostCSS. Never use hardcoded Tailwind color utilities (e.g. `bg-gray-800`). Styling goes through CSS custom properties (`var(--color-*)`) defined in `src/index.css`, applied via `style={{}}`.
- **Design tokens:** `--color-surface-{0-3}`, `--color-border`, `--color-text-{primary,secondary,muted}`, `--color-accent` (cyan), `--color-active`, `--color-danger`. Fonts: `--font-mono` (JetBrains Mono) for code/data, `--font-sans` (IBM Plex Sans) for UI labels.
- **`_ui/` primitives** are built on Radix UI (behavior) + `cva` (typed variants) + `cn`. Feature components import from `_ui/` — they never touch Radix or `cva` directly.
- **300-line hard limit** on every file (`.tsx`, `.ts`, `.css`). Enforced by ESLint `max-lines: error`.
- **ESLint flat config** (`eslint.config.mjs`). Zero tolerance: **0 errors AND 0 warnings** before any diff lands. `reportUnusedDisableDirectives: error` — inline `// eslint-disable` comments are forbidden unless explicitly approved.
- **No `any`** — `@typescript-eslint/no-explicit-any: error`.
- **Named imports only** — no default exports except `src/App.tsx` and `src/main.tsx`.
- **sql.js is synchronous** — use `try/catch`, not `.catch()`.
- **React version:** 19 (configured in eslint settings). `@types/react` is `^19.x`.

## More Detail

- **Frontend conventions** (component structure, design system, TypeScript patterns, React patterns, linting policy): `.claude/agents/am-frontend.md`
- **Development orchestration** (workflow phases, sub-agents, IPC consistency rules): `.claude/agents/am-dev.md`
- **Decision playbooks**: `.claude/playbooks/` (`state-management.md`, `component-placement.md`)
