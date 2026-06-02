# Memory mirror (backend) — design

**Date:** 2026-06-02
**Status:** Approved (design) — pending implementation
**Scope:** Backend only, additive. Same read+watch+broadcast pattern as settings/agents/skills.

## Context

Fourth slice of the `~/.claude` live-mirror refactor. Mirrors the **memory / context
sources** Claude Code loads: the **CLAUDE.md hierarchy** plus the per-project **auto-memory**.
Today these are read only partially and pull-only (`memory.service` reads the auto-memory dir
for agents; the CLAUDE.md hierarchy is not surfaced). This adds a live, scope-aware mirror of
the context sources — additive, lightweight summaries, heavy content on-demand.

## Decisions (locked)

- **Additive, backend-only.** Existing readers (`memory.service`, `agent.service` memory CRUD)
  untouched. Renderer wiring is a later slice.
- **Coverage:** the CLAUDE.md hierarchy **and** auto-memory:
  - user `~/.claude/CLAUDE.md`
  - project `<project>/CLAUDE.md` and `<project>/.claude/CLAUDE.md`
  - nested `CLAUDE.md` inside the project (bounded depth; skip `node_modules`/dotdirs/etc.)
  - auto-memory `~/.claude/projects/<encoded-project>/memory/*.md` (incl. `MEMORY.md`)
- **Lightweight summaries live; heavy content on-demand** (full file content NOT in the snapshot).
- **`@imports` in CLAUDE.md:** presence flagged only (`hasImports`); resolution/expansion is
  out of scope for v1 (on-demand if ever needed).
- **No persistence** (RAM-only snapshot). Diff-guard before broadcast.

## Data contract

```ts
export const MemorySource = {
  UserClaudeMd:    'user-claude-md',
  ProjectClaudeMd: 'project-claude-md',
  NestedClaudeMd:  'nested-claude-md',
  AutoMemory:      'auto-memory',
} as const;
export type MemorySource = (typeof MemorySource)[keyof typeof MemorySource];

export interface MemoryEntry {
  source: MemorySource;
  path: string;
  scope: 'user' | 'project';
  size: number;        // bytes
  firstLine: string;   // quick title/preview (first non-empty line, trimmed/capped)
  hasImports: boolean; // CLAUDE.md contains an `@path` import line (presence only)
}
export interface MemorySnapshot {
  projectPath: string | null;
  entries: MemoryEntry[];   // ordered: user → project → nested → auto-memory; stable
}
```

Heavy content (full text) is read on demand via the existing memory/file readers — not part
of the snapshot.

## Read & scope (`memory.mirror.ts`)

```ts
export function getMemory(projectPath?: string): MemorySnapshot;
```
- **User:** `~/.claude/CLAUDE.md` if present → one `user-claude-md` entry.
- **Project (when `projectPath`):** `<project>/CLAUDE.md` and `<project>/.claude/CLAUDE.md`
  (`project-claude-md`); nested `CLAUDE.md` under `<project>` (`nested-claude-md`) with a
  **bounded walk** (reuse `project.service`'s `SKIP_DIRS`/depth approach — skip
  `node_modules`, `.git`, dotdirs, etc.).
- **Auto-memory:** the per-project memory dir at
  `~/.claude/projects/<encoded-project>/memory/` where `<encoded-project>` is the project path
  with separators encoded — **reuse `session.service`'s existing project-path encoding /
  `PROJECTS_BASE`** (do not re-derive). List its `*.md` files (incl. `MEMORY.md`) as
  `auto-memory` entries.
- For each file build `MemoryEntry`: `fs.stat` for `size`, read just enough to get `firstLine`
  and detect an `@import` line (don't load full content). Resolve `HOME` at call time.
- Stable order (user → project → nested → auto-memory; within a group by path). Never throws
  (missing files/dirs skipped).

## Live flow (watch → broadcast)

- `watchMemory(projectPath?)` / `unwatchMemory()`.
- Watch a **bounded** set of targets (avoid recursively watching an entire project):
  `~/.claude/` (filter `CLAUDE.md`), `<project>/` + `<project>/.claude/` (filter `CLAUDE.md`),
  and `~/.claude/projects/<encoded-project>/memory/` (recursive ok — small). Debounce ~150 ms →
  re-scan → diff (`JSON.stringify`) → `broadcast({ type: 'memory_changed', snapshot })`.
- **v1 limitation (documented):** deeply-nested `CLAUDE.md` changes may not fire live (only the
  watched roots do); they appear on the next `getMemory`. Acceptable for v1.
- RAM-only snapshot; reuse the existing `broadcast` `push-event` channel.

## IPC surface (`window.api`)

- `memory:mirror:get` → `getMemoryMirror(projectPath?): Promise<MemorySnapshot>`
- `memory:mirror:watch` → `watchMemory(projectPath?): Promise<void>`
- `memory:mirror:unwatch` → `unwatchMemory(): Promise<void>`
- push `memory_changed` → `onMemoryChanged(cb): () => void` (filters `push-event` by type).

> Naming note: a `memory.ipc.ts` already exists for the agent memory-file CRUD; add the mirror
> handlers there (same domain) OR a dedicated `memory.mirror.ipc.ts` — confirm at implementation
> and avoid colliding with existing `memory:*` channels (hence the `memory:mirror:*` prefix and
> the `getMemoryMirror` method name, distinct from any existing `getMemory*`).

Renderer type surfaced via `src/types/memory-mirror.types.ts` re-export barrel.

## Testing

- **`memory.mirror`** (temp dirs, `process.env.HOME` redirected): user CLAUDE.md detected;
  project CLAUDE.md (root + `.claude/`) + a nested one detected with correct `scope`/`source`;
  auto-memory dir files (incl. MEMORY.md) detected; `firstLine` + `hasImports` correct; missing
  files skipped; stable order; change event → broadcast (`vi.mock('./broadcast')`); diff guard;
  `unwatchMemory()` in `afterEach`. (Pure ordering/shape logic, if any, can be split into a
  `memory.union`-style helper + its own test, mirroring agents/skills.)

## File layout

```
electron/types/memory-mirror.types.ts        ← MemorySource, MemoryEntry, MemorySnapshot
electron/services/memory.mirror.ts (+ .test)  ← scan hierarchy + auto-memory + watch + broadcast + getMemory
electron/ipc/memory.ipc.ts (or memory.mirror.ipc.ts) ← memory:mirror:get/watch/unwatch (+ register)
electron/preload.ts + src/env.d.ts            ← getMemoryMirror / watchMemory / unwatchMemory / onMemoryChanged
src/types/memory-mirror.types.ts              ← renderer re-export barrel
```

Backend lint caveat (as before): the real backend gate is `npx electron-vite build` + Vitest;
uphold no-`any`/named-imports/300-line by hand.

## Out of scope (later)

- Renderer wiring.
- Full memory content in the snapshot (on-demand only).
- `@import` resolution/expansion and the 4-hop import graph.
- Managed/enterprise CLAUDE.md.
- MCP mirror — the next slice.
```
