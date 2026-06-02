# Agents mirror (backend) — design

**Date:** 2026-06-02
**Status:** Approved (design) — pending implementation plan
**Scope:** Backend only, additive. No renderer/UI, no changes to existing readers/CRUD/IPC.

## Context & motivation

Second slice of the "`~/.claude` as a live source of truth" refactor, after the settings
domain. It reuses the same **read + watch + broadcast** pattern, applied to **agents**.

Today agents are read two ways, both **pull** (no live watch):
- `electron/services/agent.service.ts` — full CRUD on the **global** `~/.claude/agents`
  only (`getAllAgents`, `getAgent`, `createAgent`, `updateAgent`, `deleteAgent`,
  `getFolders`, memory-file CRUD). Backs the `agents:*` IPC.
- `electron/services/project.service.ts` — `getProjectAgents(projectId)` reads the
  **scope-aware** list (user pseudo-project + real projects) for the dashboard, cached 60 s.

Neither watches the filesystem, so the agent list goes stale until a manual re-load. This
slice adds the live layer.

## Decisions (locked)

- **Additive, backend-only.** A new mirror service that reads + watches + broadcasts. The
  existing readers (`project.service.getProjectAgents`, `agent.service`), all CRUD, and the
  current `agents:*` IPC are **left untouched**. The renderer wires to the mirror in a later
  slice. (Free consequence: because CRUD writes files, the watcher fires on CRUD-driven
  changes too — the mirror reflects create/edit/delete with no manual invalidation.)
- **Scope: union user + project.** `getAgents(projectPath?)` returns the union of
  `~/.claude/agents` and (when `projectPath` is given) `<projectPath>/.claude/agents`.
- **Project shadows user on name collision** (as in Claude Code). The shadowed user agent
  stays in the list marked `shadowed: true` (the UI decides whether to show it dimmed).
- **Lightweight list live; heavy content on-demand.** The broadcast snapshot carries
  per-agent metadata only. Body, memory files, and annex files are fetched on-demand via the
  existing `getAgent` — not in the live snapshot.
- **No persistence.** Snapshot lives in RAM only (like the settings mirror).

## Data contract

```ts
// agents-mirror.types.ts (electron/types) — reuses AgentFrontmatter from agent.types
export const AgentScope = { User: 'user', Project: 'project' } as const;
export type AgentScope = (typeof AgentScope)[keyof typeof AgentScope];

export interface AgentSummary {
  id: string;                    // frontmatter.name
  scope: AgentScope;
  filePath: string;
  relativePath: string;
  folder: string;                // '' for top-level
  frontmatter: AgentFrontmatter; // parsed; lightweight (no body/memory/annex)
  subAgents: string[];
  shadowed: boolean;             // true when a project agent of the same name overrides it
}

export interface AgentsSnapshot {
  projectPath: string | null;
  agents: AgentSummary[];        // union of user + project, shadowing resolved/marked
}
```

The heavy content (`body`, `memoryFiles`, `annexFiles` on the existing `AgentFile`) is **not**
in `AgentSummary`; consumers fetch it on demand via the existing `getAgent` IPC.

## Union & shadowing (pure logic)

`agents.union.ts` — pure, filesystem-free, unit-tested (mirrors the `settings.merge.ts`
split). Input: user summaries + project summaries. Output: one unified `AgentSummary[]`.

- Agents are keyed by `id` (frontmatter `name`).
- On a name collision between a user agent and a project agent, the **project** agent is the
  active one (`shadowed: false`); the user agent is kept in the list with `shadowed: true`.
- No collision → every agent is active (`shadowed: false`).
- Order: deterministic (e.g. project agents first, then user, or by name — fixed so the
  diff/broadcast is stable). The implementation picks one stable order and the test asserts it.

## Read & scope (`agents.mirror.ts`)

```ts
export function getAgents(projectPath?: string): AgentsSnapshot;
```
- Scans `~/.claude/agents` and (when `projectPath` is given) `<projectPath>/.claude/agents`.
- Parses each `.md` via gray-matter, building `AgentSummary` **without** loading
  body/memory/annex contents. Skips the `memory/` subdirectory and any `.md` lacking a
  `name` in frontmatter (consistent with the current `findAgentsInDir`/`countMdFiles`).
- Resolves `HOME` at call time (`process.env.HOME || os.homedir()`, as `session.service.ts`)
  so tests can redirect via `process.env.HOME`.
- Calls `agents.union` and returns `{ projectPath: projectPath ?? null, agents }`.
- Never throws (faithful-mirror rule).

## Live flow (watch → broadcast)

```ts
export function watchAgents(projectPath?: string): void;
export function unwatchAgents(): void;
```
- `watchAgents` starts `fs.watch` **recursively** on `~/.claude/agents/` and (when scoped)
  `<projectPath>/.claude/agents/` (recursive watch is supported on macOS — the target
  platform; confirm at implementation). Callbacks filter to `.md` files.
- Keep watchers in a module-level `Map` (like `session.service.ts`/`settings.service.ts`);
  skip a dir that doesn't exist without throwing; re-entrancy guard (calling `watchAgents`
  again replaces the current scope).
- On a matching change: **debounce ~150 ms** → `getAgents(currentScope)` → diff against the
  module-level last snapshot (`JSON.stringify`) → only if different, store and
  `broadcast({ type: 'agents_changed', snapshot })` over the existing `push-event` channel.
- `unwatchAgents()` closes all watchers, clears the timer, resets the stored snapshot/scope.
- Snapshot is RAM-only, never persisted.

## Error handling

- Missing agents dir → empty list (that scope contributes nothing).
- Malformed frontmatter / `.md` without `name` → that file is skipped.
- Never throws; no writes, so no risk to the user's agents.

## IPC surface (`window.api`)

New channels alongside the existing `agents:*` (no collision):
- `agents:mirror:get` → `getAgentsMirror(projectPath?): Promise<AgentsSnapshot>`
- `agents:mirror:watch` → `watchAgents(projectPath?): Promise<void>`
- `agents:mirror:unwatch` → `unwatchAgents(): Promise<void>`
- push `agents_changed` → `onAgentsChanged(cb: (snapshot) => void): () => void` (filters the
  shared `push-event` channel by `type`, mirroring `onSettingsChanged`/`onEvent`).

Handlers added to the existing `electron/ipc/agents.ipc.ts` (same domain; thin adapters
delegating to `agents.mirror`). The renderer-facing type is surfaced via a
`src/types/agents-mirror.types.ts` re-export barrel, as done for `settings.types`.

## Testing

- **`agents.union`** (pure): union of user + project; project shadows user on name collision
  (correct `shadowed` flags + active selection); no collision → all active; empty inputs →
  empty; stable ordering asserted.
- **`agents.mirror`** (temp dirs, `process.env.HOME` redirected): scan reads `.md`
  frontmatter into summaries, skips `memory/` and `name`-less files, omits heavy content;
  project scope adds project agents and applies shadowing; a change event produces a
  broadcast (`vi.mock('./broadcast')`) with the recomputed snapshot; identical content does
  not re-broadcast (diff guard); `unwatchAgents` in `afterEach`.

## File layout

```
electron/types/agents-mirror.types.ts      ← AgentScope, AgentSummary, AgentsSnapshot (reuses AgentFrontmatter)
electron/services/agents.union.ts            ← pure union + shadowing (unit-tested)
electron/services/agents.union.test.ts
electron/services/agents.mirror.ts           ← scan + union + watch + broadcast + getAgents
electron/services/agents.mirror.test.ts
electron/ipc/agents.ipc.ts                    ← + agents:mirror:get / :watch / :unwatch handlers
electron/preload.ts                           ← + getAgentsMirror / watchAgents / unwatchAgents / onAgentsChanged
src/env.d.ts                                  ← + window.api signatures
src/types/agents-mirror.types.ts              ← renderer re-export barrel
```

Backend lint caveat (same as settings): ESLint ignores `electron/**` and `typecheck` is
scoped to `src/`, so the real gate for backend files is `npx electron-vite build` + the
Vitest tests; uphold no-`any`, named imports, and the 300-line limit by hand.

## Out of scope (later slices)

- Renderer wiring (dashboard list consuming the mirror; switching off the pull readers).
- Full agent content (body/memory/annex) in the live snapshot — stays on-demand via `getAgent`.
- Unifying or removing the existing `project.service.getProjectAgents` / `agent.service`
  readers and the `agents:*` CRUD.
- Provenance richer than the `shadowed` flag.
- Skills / memory / MCP mirrors — separate slices reusing this pattern.
```
