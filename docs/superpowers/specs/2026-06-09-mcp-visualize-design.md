# MCP Visualize (MCP-1) — Design

**Date:** 2026-06-09
**Status:** Approved (brainstorm) → ready for implementation plan
**Scope:** Renderer-only. No backend / IPC changes — the MCP mirror and its IPC already exist.

## What this is

The first slice of MCP integration: **surface the configured MCP servers in the UI**, read-only. It wires the existing MCP **mirror** (which reconciles MCP server config from local files per project) into a browsable view, mirroring exactly how agents and skills are already surfaced.

This is **MCP-1** of a three-spec roadmap agreed during brainstorming:
- **MCP-1 = A — Visualize** (this spec): read-only list of configured servers.
- **MCP-2 = B — Manage/edit**: add / remove / toggle / edit server config (writes config files); expand-to-raw-config lands here.
- **MCP-3 = C+D — Live MCP client**: the app connects to servers (stdio/http/sse) to surface live connection/auth status (C) and the tools each server exposes (D). C and D share one MCP-client engine in the main process.

## Why now

Pillar 2 ("Visualize the Claude Code ecosystem — memories, sub-agents, skills, MCP servers… browsable and editable"). The MCP **backend mirror is already built** (`mcp.mirror.ts`, `mcp.reconcile.ts`, `mcp.ipc.ts`, registered in `electron/ipc/index.ts`) and exposed to the renderer (`getMcp` / `watchMcp` / `unwatchMcp` / `onMcpChanged` in `src/env.d.ts`). Nothing consumes it yet. A is the foundation the rest of the MCP roadmap attaches to, and it adds **zero backend**.

## Data source (already present)

`window.api.getMcp(projectPath?)` → `McpSnapshot` and `window.api.onMcpChanged(cb)` for live updates. Types in `src/types/mcp-mirror.types.ts`:

```ts
McpServerEntry = {
  name: string;
  source: McpSource;        // "user-settings" | "user-global" | "project-mcp-json" | "project-settings"
  scope: McpScope;          // "user" | "project"
  transport: McpTransport;  // "stdio" | "http" | "sse" | "unknown"
  target: string;           // command (stdio) or url (http/sse); '' when unknown
  shadowed: boolean;        // a higher-precedence source defines the same name
}
McpSnapshot = { projectPath: string | null; servers: McpServerEntry[] }  // reconciled, stable order
```

v1 carries the **summary** only (identity + transport + target + provenance + shadowing) — no raw arg/env block. Raw-config detail is deferred to **MCP-2**.

## Architecture

Integration mirrors the **agents/skills mirror wiring** in `useDashboardStore` (the established pattern: `get<Mirror>` + `watch<Mirror>` + `on<Mirror>Changed`, scoped by the active project path, torn down on scope switch) and the **internal-tab** navigation model (`InternalTab.kind`, routed in `TabBody`).

### Store — `src/store/useDashboardStore.ts` (modify)

- Add `mcp: McpServerEntry[]` to the state (default `[]`).
- In the existing scope-load action (the block that does `getAgentsMirror` / `watchAgents` / `onAgentsChanged`):
  - add `getMcp(watchPath)` to the parallel initial fetch;
  - subscribe `unsubscribeMcp = window.api.onMcpChanged((snap) => { if (snap.projectPath === activeScopePath) set({ mcp: snap.servers }); })`;
  - `void window.api.watchMcp(watchPath)`;
  - seed `mcp: mcpSnap.servers` in the initial `set`.
- In the teardown helper (alongside `unwatchAgents`/`unwatchSkills`): `void window.api.unwatchMcp();` and call `unsubscribeMcp?.()`.

Scope semantics match agents/skills: `watchPath` is `undefined` for the `user` project, else the project path; the reconciled snapshot already includes both user and project servers.

### Tab kind — `src/store/useWorkspaceStore.ts` (modify)

- Add `'mcp'` to the `InternalTab` `kind` union: `'chat' | 'agent' | 'skill' | 'session' | 'mcp'`.
- Open-or-focus identity: there is **one** MCP tab per project, so identity is the kind alone — in the focus-existing helper add `if (tab.kind === 'mcp') return tabs.find((t) => t.kind === 'mcp');`.
- The MCP tab needs a stable `title` (e.g. `"MCP Servers"`); no per-item id field.

### Routing — `src/components/Workspace/DashboardArea/Dashboard/DashboardSurface/TabBody.tsx` (modify)

- Read `const mcp = useDashboardStore((s) => s.mcp);`
- Add `if (tab.kind === 'mcp') return <McpView servers={mcp} />;` (place before the trailing skill branch).

### View — `src/components/Workspace/DashboardArea/Dashboard/McpView/` (create)

- `McpView.tsx` — `{ servers: McpServerEntry[] }`. Renders a flat list of `McpServerRow`; renders the empty state when `servers.length === 0`. No data fetching (the store owns the live wiring).
- `McpServerRow.tsx` — one server: name, `McpServerBadges`, target in monospace; when `shadowed`, the row is dimmed and carries a "shadowed" tag.
- `McpServerBadges.tsx` — transport badge + source/provenance badge, driven by `Record` behavior maps (see below).
- `mcpPresentation.ts` — `Record<McpTransport, {label, ...}>` and `Record<McpSource, {label, scopeHint}>` behavior maps (no fallback chains; `unknown` transport is an explicit map entry, not a default).

### Entry point

A sidebar affordance opens/focuses the MCP tab for the current project — a single nav/button (not a list, since there's one MCP view per project). It calls the existing open-or-focus tab action with an `{ kind: 'mcp', title: 'MCP Servers' }` tab. Match how agents/skills tabs are opened from the sidebar.

## State modeling (CLAUDE.md compliance)

- `McpTransport` / `McpSource` are already `as const` enums; transport→badge and source→label are `Record<…>` **behavior maps**, not ternary/fallback chains. The `unknown` transport and any unmatched source render an explicit, named fallback entry (not a silent `??`).
- No `any`; named imports; `import type` for type-only; `@/` alias; 300-line hard limit (split row/badges/presentation); design-system CSS custom properties for all color/spacing; explicit ternaries.

## Testing (strict TDD)

- `useDashboardStore` — loading a project scope seeds `mcp` from `getMcp`; an `onMcpChanged` snapshot for the active scope updates `mcp`; a snapshot for a **different** `projectPath` is ignored; switching scope tears down (`unwatchMcp` called) and re-wires. Use the existing dashboard-store test seams (the repo already tests the agents/skills wiring the same way).
- `McpView` — renders one row per server; renders the empty state for `[]`.
- `McpServerRow` / `McpServerBadges` — shows transport + source badges and target; a `shadowed` server is dimmed and tagged.
- `mcpPresentation` — every `McpTransport` and `McpSource` value has a map entry (no missing-key fallback).
- `TabBody` — a `kind:'mcp'` tab renders `McpView`.
- `useWorkspaceStore` — opening a second MCP tab focuses the existing one (open-or-focus by kind).
- Sidebar entry — clicking it opens/focuses the MCP tab.

The quality gate (`bash .claude/hooks/gate.sh`: lint 0/0, typecheck, build, tests) is the bar.

## Out of scope (later MCP specs)

- **MCP-2 (B):** editing/toggling/adding/removing servers (config-file writes, validation, safety on user config); expandable raw config (args/env) — needs a new "get raw config" read path too.
- **MCP-3 (C+D):** live connection/auth status (C) and per-server tool listing + per-session tool usage (D), via a new MCP-client engine in the main process.

## Suggested build sequence

1. Store wiring — add `mcp` to `useDashboardStore` (fetch + watch + onChanged + teardown), scoped. (TDD)
2. Tab plumbing — `'mcp'` kind in `useWorkspaceStore` (union + open-or-focus); route in `TabBody`. (TDD)
3. View — `mcpPresentation` maps → `McpServerBadges` → `McpServerRow` → `McpView` (+ empty state). (TDD)
4. Entry point — sidebar affordance opens/focuses the MCP tab. (TDD)

Each step is gate-verified and committed independently.
