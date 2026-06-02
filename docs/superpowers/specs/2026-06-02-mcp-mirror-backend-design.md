# MCP mirror (backend) — design

**Date:** 2026-06-02
**Status:** Approved (design) — pending implementation
**Scope:** Backend only, additive. Same read+watch+broadcast pattern as the other mirrors.

## Context

Fifth `~/.claude` mirror slice. MCP servers are **not read at all today** — this fills that
gap. MCP server config is scattered across several local files; this mirror **reconciles them
into one list per scope**, read-only, lightweight, live.

**v1 = static configuration only.** It mirrors *what MCP servers are configured and from
where* — NOT their live connection/auth status (that would require actually connecting to each
server, a separate concern). All data is local files (no network, no ToS issue).

## Sources reconciled (local config files)

For a scope (`projectPath` optional):
- **user** — `~/.claude/settings.json` → `mcpServers`
- **user-global** — `~/.claude.json` → top-level `mcpServers` (and, when `projectPath` given,
  `projects[<projectPath>].mcpServers` — the per-project user/local servers Claude Code stores
  there)
- **project** — `<projectPath>/.mcp.json` (shared, git-tracked) and
  `<projectPath>/.claude/settings.json` → `mcpServers`

`~/.claude.json` is large (~70 KB) — read it once and pull ONLY the `mcpServers` / `projects`
keys; never load it wholesale into the snapshot.

## Decisions (locked)

- **Additive, backend-only.** Nothing existing is modified. Renderer wiring later.
- **Reconcile by server name** with provenance; on a name collision a higher-precedence source
  wins and the shadowed one is kept marked (`shadowed: true`) — same shape as agents/skills
  shadowing. Precedence (low→high): user settings → user `~/.claude.json` → project `.mcp.json`
  → project `.claude/settings.json`. (Confirm against Claude Code's documented MCP precedence
  at implementation — the spec's earlier MCP note said "Local > Project > User > Plugin"; align
  the order and record it.)
- **Lightweight summary; raw config detail on-demand if needed.** The snapshot carries the
  identity + transport summary, not necessarily the full arg/env block.
- **No live connection/auth status** (out of scope — needs connecting to servers).
- **No persistence** (RAM-only). Diff-guard before broadcast.

## Data contract

```ts
export const McpSource = {
  UserSettings:    'user-settings',   // ~/.claude/settings.json
  UserGlobal:      'user-global',     // ~/.claude.json
  ProjectMcpJson:  'project-mcp-json',// <project>/.mcp.json
  ProjectSettings: 'project-settings',// <project>/.claude/settings.json
} as const;
export type McpSource = (typeof McpSource)[keyof typeof McpSource];

export type McpTransport = 'stdio' | 'http' | 'sse' | 'unknown';

export interface McpServerEntry {
  name: string;
  source: McpSource;
  scope: 'user' | 'project';
  transport: McpTransport;       // derived from config shape (command → stdio; url + type → http/sse)
  target: string;                // command (stdio) or url (http/sse), for a quick summary
  shadowed: boolean;             // a higher-precedence source defines the same name
}
export interface McpSnapshot {
  projectPath: string | null;
  servers: McpServerEntry[];     // reconciled, stable order
}
```

`transport`/`target` are derived from the per-server config: `{ command, args }` → `stdio`
(target = command); `{ url, type: 'sse'|'http' }` → that transport (target = url); else
`unknown`. Full `args`/`env`/headers are NOT in the snapshot (on-demand later if needed).

## Read & reconcile (`mcp.mirror.ts` + pure `mcp.reconcile.ts`)

- `getMcp(projectPath?): McpSnapshot` — read each source file (missing/invalid → contributes
  nothing, never throws), extract its `mcpServers` map, tag each server with its `source`/
  `scope`/`transport`/`target`, then `mcp.reconcile.ts` (pure, unit-tested) merges by name with
  the locked precedence and marks `shadowed`. Stable order. Resolve HOME at call time.
- The pure reconcile logic is split into `mcp.reconcile.ts` (no fs) like `agents.union.ts`.

## Live flow (watch → broadcast)

- `watchMcp(projectPath?)` / `unwatchMcp()`. Watch the parent dirs of the source files —
  `~/.claude/` (filter `settings.json`), `~/` (filter `.claude.json`), `<projectPath>/`
  (filter `.mcp.json`) and `<projectPath>/.claude/` (filter `settings.json`). Debounce ~150 ms
  → re-read → diff (`JSON.stringify`) → `broadcast({ type: 'mcp_changed', snapshot })`.
  RAM-only snapshot; reuse the existing `broadcast` channel.
- Watching `~/` directly (for `.claude.json`) — filter strictly to the `.claude.json` filename
  to avoid noise; if watching `$HOME` non-recursively is too noisy, watch the file's directory
  with a tight filename filter (it IS `$HOME`, non-recursive — acceptable).

## IPC surface (`window.api`)

- `mcp:mirror:get` → `getMcp(projectPath?): Promise<McpSnapshot>`
- `mcp:mirror:watch` → `watchMcp(projectPath?): Promise<void>`
- `mcp:mirror:unwatch` → `unwatchMcp(): Promise<void>`
- push `mcp_changed` → `onMcpChanged(cb): () => void` (filters `push-event` by type).

New `electron/ipc/mcp.ipc.ts` (no existing MCP domain) registered in `ipc/index.ts`. Renderer
type via `src/types/mcp-mirror.types.ts` re-export barrel.

## Testing

- **`mcp.reconcile`** (pure): merge across sources, precedence + `shadowed` flags, transport
  derivation (stdio/http/sse/unknown), empty inputs, stable order.
- **`mcp.mirror`** (temp dirs, `process.env.HOME` redirected): reads each source file, ignores
  missing/invalid JSON, pulls only `mcpServers` from a large `.claude.json`-like file, project
  scope adds project sources + applies shadowing, change event → broadcast (`vi.mock`), diff
  guard, `unwatchMcp()` in `afterEach`.

## File layout

```
electron/types/mcp-mirror.types.ts          ← McpSource, McpTransport, McpServerEntry, McpSnapshot
electron/services/mcp.reconcile.ts (+ .test)  ← pure reconcile + shadowing + transport derivation
electron/services/mcp.mirror.ts (+ .test)     ← read sources + reconcile + watch + broadcast + getMcp
electron/ipc/mcp.ipc.ts                        ← mcp:mirror:get/watch/unwatch (+ register in ipc/index.ts)
electron/preload.ts + src/env.d.ts             ← getMcp / watchMcp / unwatchMcp / onMcpChanged
src/types/mcp-mirror.types.ts                  ← renderer re-export barrel
```

Backend lint caveat (as before): real backend gate is `npx electron-vite build` + Vitest;
uphold no-`any`/named-imports/300-line by hand.

## Out of scope (later)

- Renderer wiring.
- Live connection/auth status of MCP servers (needs connecting — separate feature).
- Plugin-provided MCP servers and Claude.ai connectors.
- Full per-server config (args/env/headers) in the snapshot — on-demand if needed.
```
