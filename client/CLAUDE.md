# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # vite dev server on port 5173 (HMR)
npm run build     # tsc -b && vite build
npm run preview   # serve production build
```

Requires the server running on port 3456 (Vite proxies `/api` there). Use `./start.sh` from root to launch everything together. No test suite or linter configured.

## Architecture

React 18 SPA built with Vite. Tailwind CSS 3 for styling (dark theme, gray-950 base). No routing library used for navigation — the app is a single-page dashboard with component-level state.

### Vite Config

- Proxies `/api` → `http://localhost:3456` (the server)
- Path alias: `@/` → `src/`
- Port: 5173

### Component Tree

```
App
├── ProjectSwitcher          # dropdown to pick a project
├── StatsBar                 # top bar stats (active agents, connection status)
├── ProjectDashboard         # main content area when a project is selected
│   ├── AgentDetail          # expanded view of one agent (frontmatter, body, memory, annexes)
│   ├── AgentForm            # create/edit agent form
│   ├── AgentContextMenu     # right-click context menu on agents
│   ├── AgentGraph           # directed graph of agent relationships (@xyflow/react)
│   ├── AgentMesh            # force-directed graph (react-force-graph-2d)
│   ├── MemoryViewer         # view/edit agent memory files
│   └── CostDashboard        # cost analytics charts (recharts)
├── EventConsole             # live SSE event feed (bottom panel)
└── ChatPanel                # overlay panel to chat with spawned agents
```

### Data Fetching

- **No data-fetching library** (no TanStack Query, no SWR). Plain `fetch` via `services/api.ts` helper.
- **SSE**: `hooks/useSSE.ts` opens an `EventSource` to `/api/events/stream`. Receives real-time events, tracks active agents (5s timeout after last event).
- **Custom hooks**: `useProjects` (project list + dashboard fetch), `useAgents` (agent CRUD), `useStats` (derived from event count).

### API Client

`services/api.ts` exports an `api` object with typed methods for agent CRUD and memory file operations. All calls go through a shared `request<T>()` wrapper that handles JSON parsing and error extraction.

### Key Libraries

| Library | Usage |
|---|---|
| `@xyflow/react` | Agent relationship graph (directed) |
| `react-force-graph-2d` | Agent mesh visualization (force-directed) |
| `recharts` | Cost analytics charts |
| `react-markdown` | Rendering agent body/memory content |
| `lucide-react` | Icons |
| `react-router-dom` | Imported but routing is minimal — single-page app |

### Styling

- Tailwind CSS 3 with PostCSS + Autoprefixer
- Dark theme throughout: `bg-gray-950`, `text-gray-200`, `border-gray-800`
- Accent color: cyan (`text-cyan-400`, `bg-cyan-600`)
- Component-level Tailwind classes, no CSS modules or separate stylesheets beyond `index.css`

## Conventions

- Types in `src/types/` — duplicated from server by convention, not shared via package
- Components are default-exported single files in `src/components/`
- Hooks are in `src/hooks/`, prefixed with `use`
- State management is local (`useState`/`useCallback`), no global store
- `MarkdownBody` wraps `react-markdown` for consistent rendering
- `Accordion` is a reusable collapsible section component
