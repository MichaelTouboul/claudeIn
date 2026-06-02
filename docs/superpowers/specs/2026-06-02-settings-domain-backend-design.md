# Settings domain (backend) — design

**Date:** 2026-06-02
**Status:** Approved (design) — pending implementation plan
**Scope:** Backend only. No renderer / UI work in this slice.

## Context & motivation

The app's north star is to faithfully and **live** reflect the user's `~/.claude`
directory as the single source of truth. An audit showed we are far from that: the
only live flow today is session transcripts (`session.service.ts` `fs.watch`); every
other concept (agents, skills, settings, memory) is a pull/snapshot read with a 60 s
cache, and several are not read at all.

This is the **first incremental slice** of that larger refactor: a clean, backend-only
`settings` domain that reads the Claude Code settings layers, computes the effective
(merged) value with provenance, and pushes updates live when any layer changes. It
establishes the **read + merge + watch + broadcast** pattern that later slices
(agents, skills, memory) will reuse.

Today the only settings handling is `project.service.ts`: an existence check
(`hasSettings`) and parsing of the `hooks` field (`getProjectHooks`). No other field is
read; `settings.local.json`, the managed layer, and `~/.claude.json` are never opened.

## Decisions (locked)

- **Backend only.** Service + IPC + preload + `env.d.ts` contract. No renderer
  components, no display decisions in this slice.
- **All file-backed layers**, in Claude Code precedence order, including managed.
  Command-line flags are per-invocation and not on disk → out of scope.
- **Read-only + live.** We read and watch; we never write settings (no risk of
  corrupting the user's Claude Code config). Editing is a later slice.
- **Backend computes the merge.** The IPC returns raw layers **plus** the computed
  `effective` value **plus** a `provenance` map. Domain logic stays in the main process;
  the renderer (later) only renders.
- **Provenance at top-level key granularity** for this slice. Per-leaf (deep-path)
  provenance is a later refinement, explicitly out of scope here.
- **No persistence.** The result is never written to the app's SQLite DB. The source of
  truth stays the disk; the snapshot lives only in memory while watching.

## Layers & precedence

Low → high precedence (higher overrides lower):

| Order | Source        | Path |
|-------|---------------|------|
| 1     | `user`        | `~/.claude/settings.json` |
| 2     | `userLocal`   | `~/.claude/settings.local.json` |
| 3     | `project`     | `<projectPath>/.claude/settings.json` (only if `projectPath` given) |
| 4     | `projectLocal`| `<projectPath>/.claude/settings.local.json` |
| 5     | `managed`     | `/Library/Application Support/ClaudeCode/managed-settings.json` (highest) |

> **To verify during implementation:** the official docs list precedence as
> managed > CLI > project-local > project > user, but do **not** explicitly place a
> *user-level* `~/.claude/settings.local.json` (which exists on this machine). This
> design places it between `user` and `project`. Confirm against current docs / actual
> Claude Code behavior before finalizing, and the managed file name
> (`managed-settings.json`) likewise.

## File layout (back conventions)

```
electron/types/settings.types.ts      ← types shared with the renderer
electron/services/settings.merge.ts    ← pure merge + provenance (no fs, unit-tested)
electron/services/settings.service.ts  ← orchestration: read layers + watch + broadcast
electron/ipc/settings.ipc.ts           ← handlers: settings:get / settings:watch / settings:unwatch
electron/ipc/index.ts                  ← + register settings handlers
electron/preload.ts                    ← + window.api.getSettings / watchSettings / unwatchSettings / onSettingsChanged
src/env.d.ts                           ← + matching window.api signatures (the contract)
```

Splitting `settings.merge.ts` from `settings.service.ts` is deliberate: the merge is
pure logic (testable without the filesystem) and the split keeps both files under the
300-line limit.

## Data contract

```ts
// settings.types.ts
export const SettingsSource = {
  Managed: 'managed',
  User: 'user',
  UserLocal: 'userLocal',
  Project: 'project',
  ProjectLocal: 'projectLocal',
} as const;
export type SettingsSource = (typeof SettingsSource)[keyof typeof SettingsSource];

export interface SettingsLayer {
  source: SettingsSource;
  path: string;
  exists: boolean;
  data: Record<string, unknown> | null;  // null if absent OR JSON invalid
  error?: string;                          // parse error message, if any
}

export interface SettingsSnapshot {
  projectPath: string | null;
  layers: SettingsLayer[];                       // ordered by precedence (low → high)
  effective: Record<string, unknown>;            // merged result
  provenance: Record<string, SettingsSource[]>;  // top-level key → contributing sources
}
```

## Merge semantics (`settings.merge.ts`)

Mirrors Claude Code's documented merge behavior:

- **Arrays concatenate** across layers (e.g. `permissions.allow` from every layer
  combine). Provenance for such a key lists **all** contributing sources.
- **Objects deep-merge** (e.g. `env`, nested keys layer on top).
- **Scalars override** — the highest-precedence layer that sets the key wins.
  Provenance lists the single winning source.
- Layers are applied in precedence order (user → userLocal → project → projectLocal →
  managed last), so `managed` wins ties.
- A layer with `data === null` (absent or malformed) is **skipped** by the merge.

`provenance` is computed at **top-level key** granularity: for each top-level key in
`effective`, which source(s) contributed its final value.

## Live flow (watch → broadcast)

- `watchSettings(projectPath?)` starts watchers on the **parent directories**
  (`~/.claude/`, the managed dir, and `<projectPath>/.claude/` when given), filtering by
  filename — not `fs.watch` on the files directly, because editors save via
  write-then-rename and a file watch misses those events. Debounce ~150 ms.
- On any change: re-read affected layers, recompute the snapshot, and **push
  `onSettingsChanged(snapshot)`** to the renderer through `broadcast.ts`. Only push when
  the recomputed snapshot actually differs from the last one (diff against the in-memory
  snapshot).
- `unwatchSettings()` closes all watchers for the current scope.
- This calques the existing `watchSessions` idiom in `session.service.ts` (the repo's
  only `fs.watch` today) — same lifecycle shape.

## Storage & lifecycle

- **Not persisted.** The extraction result is never written to `data.db`. Persisting it
  would create a second source of truth that can diverge from `~/.claude` — the exact
  problem this refactor removes. SQLite stays reserved for app-owned data (events,
  favorites, chats, missions…).
- **In-memory only.** `getSettings` reads files fresh on each call (files are a few KB —
  cheap, and re-reading keeps fidelity). While watching, the service keeps the **last
  computed snapshot** in a module-level variable (like `cachedProjects` in
  `project.service.ts` — RAM, not DB) for debounce/diff and instant response.
- The renderer will later hold its own copy in a zustand store, refreshed by the push —
  a consumption cache, also non-persistent. Out of scope here.

```
~/.claude/*.json  ──read──▶  settings.service (in-RAM snapshot)  ──push──▶  [renderer zustand, later]
 (source of truth)            (ephemeral mirror)                            (display cache)
```

## Error handling (faithful mirror = never crash)

- Missing file → `{ exists: false, data: null }`.
- Malformed JSON → `{ exists: true, data: null, error }`; the merge skips that layer
  instead of throwing. The mirror **surfaces** the error rather than hiding it.
- No writes → no risk of corrupting the user's config.

## IPC surface (`window.api`)

- `getSettings(projectPath?: string): Promise<SettingsSnapshot>` — one-shot snapshot.
- `watchSettings(projectPath?: string): void` — start watchers for the scope.
- `unwatchSettings(): void` — stop watchers.
- `onSettingsChanged(cb: (snapshot: SettingsSnapshot) => void): () => void` — subscribe
  to live pushes (returns an unsubscribe). Wiring matches the existing push/broadcast
  mechanism used by sessions.

Channel naming follows `domain:action` — `settings:get`, `settings:watch`,
`settings:unwatch`, and a `settings:changed` push.

## Testing

- **`settings.merge.test.ts` (the core):** layer-object fixtures → assert `effective`,
  `provenance`, and precedence — managed wins ties, arrays concatenate across layers,
  objects deep-merge, scalars override, null/malformed layers are skipped. Pure,
  deterministic, no filesystem.
- **Read/watch:** exercised against temporary directories (following
  `pty.service.test.ts`), covering missing files, malformed JSON, and a change event
  producing a recomputed snapshot.

## Out of scope (later slices)

- Any renderer / UI (display, zustand store, components).
- Writing/editing settings.
- Per-leaf (deep-path) provenance.
- `~/.claude.json` (runtime/app state) and `keybindings.json`.
- Other `~/.claude` concepts (agents, skills, memory) — separate slices reusing this
  pattern.
- Persistence / settings change history.
```