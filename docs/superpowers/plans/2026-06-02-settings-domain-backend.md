# Settings Domain (backend) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A backend-only `settings` domain that reads the Claude Code settings layers under `~/.claude` (managed / user / userLocal / project / projectLocal), computes the effective merged value plus top-level provenance, watches the files, and pushes updates live to the renderer via `broadcast.ts`. Read-only, no persistence (in-RAM snapshot only).

**Architecture:** Establishes the **read + merge + watch + broadcast** pattern that later slices (agents, skills, memory) will reuse. The merge is **pure** logic split into its own file (`settings.merge.ts`) for unit-testability and the 300-line limit; the service (`settings.service.ts`) owns filesystem reads, the in-RAM snapshot, watchers, and broadcast. The watch idiom mirrors `session.service.ts` `watchSessions` (the repo's only `fs.watch` today) — watch the **parent directory**, filter by filename, debounce.

**Spec (source of truth):** `docs/superpowers/specs/2026-06-02-settings-domain-backend-design.md`

**Tech Stack:** Electron, Node `fs`, Vitest (`@vitest-environment node`), TypeScript (no `any`).

---

## ⚠️ Execution discipline (read before starting)

1. **Isolated worktree only.** All code work runs in an **isolated git worktree subagent**, never directly on `main`. The worktree needs a tracked `.claude/settings.json` so git operations work inside it.
2. **Phase = test + commit unit.** Each phase below is independently testable and committable. **Verify the gate, then commit, before moving to the next phase.** Never batch multiple phases into one commit (hard user preference).
3. **Per-phase gate** (run the subset relevant to the files touched):
   - `npm run typecheck` → **0 errors** (covers `src/`, incl. `src/env.d.ts`).
   - `npm run lint:fix && npm run lint` → **0 errors / 0 warnings**.
   - `npm run test -- <pattern>` → relevant Vitest tests green.
   - `npx electron-vite build` → succeeds (this is what actually compiles the `electron/` main-process code).
4. **Lint scope caveat (important).** ESLint **ignores `electron/**`** (`eslint.config.mjs` line 18) and `npm run typecheck` is scoped to `tsconfig.web.json` (`src/` only). So for backend files the real correctness gate is **`npx electron-vite build`** (esbuild-compiles the main process) **plus the Vitest tests**. The CLAUDE.md conventions for `electron/` (no `any`, named imports, **300-line hard limit**) are **not auto-enforced by lint** here — the subagent must uphold them by hand and confirm each new `electron/` file is < 300 lines.
5. **Two open items to confirm against real Claude Code behavior — do NOT assume silently.** The spec flags these; resolve them in **Phase 2** before finalizing the layer table (see Phase 2, Step 0):
   - **(a)** Precedence position of the **user-level** `~/.claude/settings.local.json` (`userLocal`). The spec places it between `user` and `project`; official docs list precedence as managed > CLI > project-local > project > user without explicitly placing a *user-level* local file. Confirm against current docs / observed behavior.
   - **(b)** The **managed** settings file name/path on macOS (`/Library/Application Support/ClaudeCode/managed-settings.json`). Confirm the directory name (`ClaudeCode` vs `Claude Code`) and file name against current docs / the actual machine.
   - If either differs, update `settings.service.ts`'s `buildLayerPaths()` and the spec's layer table; record the resolved facts in the Phase 2 commit message and (if material) note it back in the spec.

---

## File structure

```
electron/types/settings.types.ts      ← types shared with the renderer (SettingsSource, SettingsLayer, SettingsSnapshot)
electron/services/settings.merge.ts    ← PURE merge + provenance (no fs) — unit-tested
electron/services/settings.merge.test.ts
electron/services/settings.service.ts  ← orchestration: build layer paths + read + in-RAM snapshot + watch + broadcast
electron/services/settings.service.test.ts
electron/ipc/settings.ipc.ts           ← handlers: settings:get / settings:watch / settings:unwatch
```

Modified: `electron/ipc/index.ts`, `electron/preload.ts`, `src/env.d.ts`.

**Deliberate split (300-line limit):** `settings.merge.ts` holds pure logic (deep-merge, array concat, scalar override, provenance) and is filesystem-free so it can be unit-tested in isolation; `settings.service.ts` holds everything that touches the disk, the module-level snapshot, watchers, and `broadcast`. Keeping them separate keeps both well under 300 lines and lets the merge test run with zero I/O.

---

## Phase 1 — Types + pure merge/provenance logic + unit test

**Why first:** the merge is the core of the domain and is testable with zero filesystem — a fast, deterministic foundation everything else builds on.

**Files:**
- Create: `electron/types/settings.types.ts`
- Create: `electron/services/settings.merge.test.ts`
- Create: `electron/services/settings.merge.ts`

- [ ] **Step 1: Define the data contract** in `electron/types/settings.types.ts`

Mirror the spec verbatim (`as const` object + derived union per the root TypeScript rules — no enum):

```ts
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
  data: Record<string, unknown> | null; // null if absent OR JSON invalid
  error?: string;                        // parse error message, if any
}

export interface SettingsSnapshot {
  projectPath: string | null;
  layers: SettingsLayer[];                      // ordered by precedence (low → high)
  effective: Record<string, unknown>;           // merged result
  provenance: Record<string, SettingsSource[]>; // top-level key → contributing sources
}
```

> File-naming note: this file legitimately holds **both** an `interface` set and an `as const`/`type` pair. The repo's existing `types/*.types.ts` files (e.g. `session.types.ts`) already co-locate interfaces and types under the `.types.ts` suffix, so `settings.types.ts` is the correct single barrel here — do not split by kind.

- [ ] **Step 2: Write the failing unit test** `electron/services/settings.merge.test.ts`

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { mergeLayers } from './settings.merge';
import type { SettingsLayer } from '../types/settings.types';

function layer(source: SettingsLayer['source'], data: Record<string, unknown> | null): SettingsLayer {
  return { source, path: `/fake/${source}.json`, exists: data !== null, data };
}

describe('mergeLayers', () => {
  it('scalars: highest-precedence layer wins; provenance is the single winner', () => {
    const { effective, provenance } = mergeLayers([
      layer('user', { model: 'sonnet' }),
      layer('managed', { model: 'opus' }),
    ]);
    expect(effective.model).toBe('opus');
    expect(provenance.model).toEqual(['managed']);
  });

  it('managed wins ties (applied last)', () => {
    const { effective } = mergeLayers([
      layer('user', { theme: 'dark' }),
      layer('project', { theme: 'light' }),
      layer('managed', { theme: 'system' }),
    ]);
    expect(effective.theme).toBe('system');
  });

  it('arrays concatenate across layers; provenance lists ALL contributors in precedence order', () => {
    const { effective, provenance } = mergeLayers([
      layer('user', { permissions: { allow: ['Read'] } } as Record<string, unknown>),
      layer('project', { permissions: { allow: ['Write'] } } as Record<string, unknown>),
    ]);
    expect((effective.permissions as { allow: string[] }).allow).toEqual(['Read', 'Write']);
    expect(provenance.permissions).toEqual(['user', 'project']);
  });

  it('objects deep-merge (env keys layer on top, not replace)', () => {
    const { effective } = mergeLayers([
      layer('user', { env: { A: '1', B: '1' } }),
      layer('project', { env: { B: '2', C: '3' } }),
    ]);
    expect(effective.env).toEqual({ A: '1', B: '2', C: '3' });
  });

  it('null / malformed layers are skipped entirely', () => {
    const { effective, provenance } = mergeLayers([
      layer('user', { model: 'sonnet' }),
      layer('project', null), // malformed or absent
    ]);
    expect(effective.model).toBe('sonnet');
    expect(provenance.model).toEqual(['user']);
  });

  it('a top-level key contributed by multiple layers via deep-merge lists all of them', () => {
    const { provenance } = mergeLayers([
      layer('user', { env: { A: '1' } }),
      layer('project', { env: { B: '2' } }),
    ]);
    expect(provenance.env).toEqual(['user', 'project']);
  });
});
```

- [ ] **Step 2b: Run the test to confirm it FAILS** — `npm run test -- settings.merge` → cannot resolve `./settings.merge`.

- [ ] **Step 3: Implement `electron/services/settings.merge.ts`** (pure, no `fs`, no Electron imports)

Public interface:
```ts
export function mergeLayers(
  layers: SettingsLayer[], // ordered low → high precedence
): Pick<SettingsSnapshot, 'effective' | 'provenance'>;
```
Semantics to implement (per spec "Merge semantics"):
- Iterate layers **in the given order** (low → high), skipping any with `data === null`.
- For each top-level key: **arrays concat** (low first, then higher), **plain objects deep-merge** recursively, **scalars override** (later wins).
- Track contributing sources per top-level key: a source is recorded in `provenance[key]` whenever it **contributes** to the final value (for arrays/objects every contributing layer is listed in precedence order; for scalars only the single winning source). Keep the provenance arrays in low→high order and de-duplicated.
- The caller (service) passes layers already in precedence order with `managed` **last**, so "later wins" yields "managed wins ties" — assert this in the test (already covered).

Implementation notes: write small internal pure helpers (`isPlainObject`, `deepMergeValue`) in the same file; do not import `fs` or `electron`. Keep under 300 lines (this is comfortably small).

- [ ] **Step 4: Run the test to confirm it PASSES** — `npm run test -- settings.merge` → all green.

- [ ] **Step 5: Gate** — `npm run typecheck` (0), `npm run lint:fix && npm run lint` (0/0; touches no `src` so trivially clean but run it), `npx electron-vite build` (succeeds). Confirm both new `electron/` files are < 300 lines.

- [ ] **Step 6: Commit**
```bash
git add electron/types/settings.types.ts electron/services/settings.merge.ts electron/services/settings.merge.test.ts
git commit -m "feat(settings): types + pure layer merge/provenance with unit tests"
```

---

## Phase 2 — Layer reading (service: paths + read + snapshot) + tests with temp dirs

**Why now:** with merge proven, add the filesystem read that produces `SettingsLayer[]` and assembles a `SettingsSnapshot`. No watching yet — pure one-shot read, tested against temporary directories (per `pty.service.test.ts` style).

**Files:**
- Create: `electron/services/settings.service.test.ts`
- Create: `electron/services/settings.service.ts`

- [ ] **Step 0: Resolve the two open items (see Execution discipline §5).** Confirm (a) `userLocal` precedence position and (b) the managed file name/path on macOS, against current Claude Code docs and the actual machine (the user's `~/.claude/settings.local.json` exists). Encode the confirmed facts in `buildLayerPaths()`. If anything differs from the spec's layer table, update the spec and note the resolution in this phase's commit message. **Do not proceed on an unverified assumption.**

- [ ] **Step 1: Design the service's read surface** (`settings.service.ts`)

Public interface for this phase:
```ts
// Build the ordered (low → high) list of layer descriptors for a scope.
// Exported so the test can assert path/order without hitting disk.
export function buildLayerPaths(projectPath?: string): { source: SettingsSource; path: string }[];

// Read every layer fresh from disk and compute the snapshot. No caching here.
export function getSettings(projectPath?: string): SettingsSnapshot;
```
Behavior:
- `buildLayerPaths` returns descriptors in precedence order: `user` (`~/.claude/settings.json`), `userLocal` (`~/.claude/settings.local.json`), then — **only if `projectPath` given** — `project` (`<projectPath>/.claude/settings.json`), `projectLocal` (`<projectPath>/.claude/settings.local.json`), then `managed` (the confirmed macOS path) **last** so merge precedence puts managed highest. Use `os.homedir()` / `process.env.HOME` exactly as `session.service.ts` does (`const HOME = process.env.HOME || require("os").homedir();`) for consistency.
- For each descriptor, read the file: missing → `{ exists: false, data: null }`; present but invalid JSON → `{ exists: true, data: null, error: <message> }`; present + valid → `{ exists: true, data }`. **Never throw** (faithful-mirror rule).
- Call `mergeLayers(layers)` and return `{ projectPath: projectPath ?? null, layers, effective, provenance }`.
- Reads are **synchronous** here (`fs.readFileSync` + `JSON.parse`) — files are a few KB and the contract is `Promise<SettingsSnapshot>` only because IPC wraps it; the service itself can be sync (the IPC handler returns the value and Electron serializes it). Keep it simple and synchronous like the rest of the read paths.

> **Testability seam for HOME / managed path:** to let the test point the user layer at a temp dir, the read functions must resolve the home dir and managed path through values that the test can control. Prefer an internal `resolveBasePaths()` that reads `process.env.HOME` (and an overridable managed-dir constant) at call time, so the test sets `process.env.HOME` to a temp dir before calling `getSettings()`. Do **not** add a public param just for tests if env override is enough; if the managed path can't be redirected via env, expose it through a small internal indirection the test can stub — but keep the public IPC surface unchanged.

- [ ] **Step 2: Write the failing test** `electron/services/settings.service.test.ts`

```ts
// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { getSettings } from './settings.service';

let tmpHome: string;
let prevHome: string | undefined;

beforeEach(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'cam-settings-'));
  prevHome = process.env.HOME;
  process.env.HOME = tmpHome;
  fs.mkdirSync(path.join(tmpHome, '.claude'), { recursive: true });
});

afterEach(() => {
  process.env.HOME = prevHome;
  fs.rmSync(tmpHome, { recursive: true, force: true });
});

function writeUser(json: string) {
  fs.writeFileSync(path.join(tmpHome, '.claude', 'settings.json'), json);
}

describe('settings.service getSettings', () => {
  it('returns layers in precedence order; missing files are exists:false/data:null', () => {
    const snap = getSettings();
    const sources = snap.layers.map((l) => l.source);
    // user, userLocal, managed (no project scope). Exact order asserted after Phase 2 Step 0.
    expect(sources).toContain('user');
    expect(sources).toContain('managed');
    expect(snap.layers.find((l) => l.source === 'user')?.exists).toBe(false);
  });

  it('reads valid user settings into effective', () => {
    writeUser(JSON.stringify({ model: 'sonnet' }));
    const snap = getSettings();
    expect(snap.effective.model).toBe('sonnet');
    expect(snap.provenance.model).toEqual(['user']);
  });

  it('malformed JSON → exists:true, data:null, error set, and the merge skips it', () => {
    writeUser('{ not valid json');
    const snap = getSettings();
    const userLayer = snap.layers.find((l) => l.source === 'user');
    expect(userLayer?.exists).toBe(true);
    expect(userLayer?.data).toBeNull();
    expect(userLayer?.error).toBeTruthy();
    expect(snap.effective.model).toBeUndefined();
  });

  it('project scope adds project + projectLocal layers between userLocal and managed', () => {
    const projDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cam-proj-'));
    fs.mkdirSync(path.join(projDir, '.claude'), { recursive: true });
    fs.writeFileSync(path.join(projDir, '.claude', 'settings.json'), JSON.stringify({ model: 'opus' }));
    const snap = getSettings(projDir);
    expect(snap.projectPath).toBe(projDir);
    expect(snap.effective.model).toBe('opus'); // project overrides absent user
    expect(snap.layers.map((l) => l.source)).toContain('project');
    fs.rmSync(projDir, { recursive: true, force: true });
  });
});
```
(Adjust the exact `sources` order assertion to the order confirmed in Step 0.)

- [ ] **Step 2b: Run to confirm FAIL** — `npm run test -- settings.service` (cannot resolve `getSettings`).

- [ ] **Step 3: Implement the read logic** in `settings.service.ts` (watch/broadcast deferred to Phase 3 — leave a clear section comment where they'll go).

- [ ] **Step 4: Run to confirm PASS** — `npm run test -- settings.service` → green. Also re-run `npm run test -- settings` to keep the merge suite green.

- [ ] **Step 5: Gate** — typecheck (0), lint:fix && lint (0/0), `npx electron-vite build` (succeeds). Confirm `settings.service.ts` < 300 lines (if it's getting close, that's a signal Phase 3's watch code should be extracted — see the Phase 3 note).

- [ ] **Step 6: Commit**
```bash
git add electron/services/settings.service.ts electron/services/settings.service.test.ts
git commit -m "feat(settings): read all layers from disk into a snapshot (+ temp-dir tests)"
```
Include the resolved Step-0 facts in the commit body (confirmed userLocal precedence + managed path).

---

## Phase 3 — Watch + broadcast live push

**Why now:** the snapshot is correct; make it **live**. Watch the parent directories, debounce, recompute, and push `settings:changed` only when the snapshot actually changed.

**Files:**
- Modify: `electron/services/settings.service.ts` (add watch lifecycle + module-level snapshot + diff + broadcast)
- Modify: `electron/services/settings.service.test.ts` (add a change-event test)

> **300-line guard:** if adding the watch lifecycle pushes `settings.service.ts` toward 300 lines, extract the watcher mechanics into a sibling `electron/services/settings.watch.ts` (pure watch plumbing — start/stop/debounce, calling back into the service to recompute). Decide at implementation time based on the actual line count; prefer keeping read + watch together if it comfortably fits.

- [ ] **Step 1: Add the watch surface** (mirroring `session.service.ts` `startWatching`/`stopWatching`)

Public interface:
```ts
export function watchSettings(projectPath?: string): void;
export function unwatchSettings(): void;
```
Behavior (per spec "Live flow"):
- `watchSettings` records the current scope and starts `fs.watch` on the **parent directories** — `~/.claude/`, the managed dir, and (when given) `<projectPath>/.claude/` — **not** on the files directly (editors save via write-then-rename; a file watch misses those). In each watcher's callback, filter by the relevant filename(s) for that directory.
- Keep watchers in a module-level `Map` (like `watchers` in `session.service.ts`). Guard: if a dir doesn't exist, skip its watcher (don't throw); re-entrancy guard so calling `watchSettings` twice for the same scope doesn't double-watch.
- On a matching change: **debounce ~150 ms** (a single trailing timer), then `getSettings(currentScope)`, compare to the module-level **last snapshot** (deep-equal on the serialized snapshot), and only if different: store the new one and `broadcast({ type: 'settings_changed', snapshot })`.
- `unwatchSettings()` closes all watchers for the current scope, clears the timer, and resets the stored snapshot/scope.
- Keep the in-RAM snapshot in a module-level variable (RAM only, never DB — like `cachedProjects` in `project.service.ts`).

> **Broadcast shape:** `broadcast()` sends `{ ...data }` over the single `push-event` channel; the renderer's `onSettingsChanged` (Phase 4 preload) filters by `data.type === 'settings_changed'`. Reuse the existing `broadcast` from `./broadcast` exactly as `session.service.ts` does — do **not** add a new channel.

- [ ] **Step 2: Add the change-event test** to `settings.service.test.ts`

```ts
it('pushes a recomputed snapshot via broadcast when a watched layer changes', async () => {
  // Spy on broadcast: vi.mock('./broadcast', () => ({ broadcast: vi.fn() })) at top of file,
  // OR drive it through a test-observable seam. Then:
  watchSettings();
  writeUser(JSON.stringify({ model: 'opus' }));
  await waitFor(() => broadcastMock.mock.calls.some(
    ([d]) => d.type === 'settings_changed' && d.snapshot.effective.model === 'opus',
  ));
  unwatchSettings();
});
```
Use a `waitFor(predicate, timeout)` poller exactly like `pty.service.test.ts`. Mock `./broadcast` with `vi.mock` so the test observes the push without an Electron `BrowserWindow`. Assert: (1) a `settings_changed` push fires after the write, (2) the pushed `snapshot.effective` reflects the new value, (3) writing the **same** content again does **not** produce a second push (diff guard). Always `unwatchSettings()` in `afterEach` to avoid leaking watchers/timers between tests.

- [ ] **Step 3: Run to confirm PASS** — `npm run test -- settings` (merge + service suites green).

- [ ] **Step 4: Gate** — typecheck (0), lint:fix && lint (0/0), `npx electron-vite build` (succeeds). Confirm every `electron/` settings file < 300 lines (extract `settings.watch.ts` now if needed).

- [ ] **Step 5: Commit**
```bash
git add electron/services/settings.service.ts electron/services/settings.service.test.ts
# (+ electron/services/settings.watch.ts if the split was needed)
git commit -m "feat(settings): watch layer dirs + debounced live broadcast on change"
```

---

## Phase 4 — IPC + preload + env.d.ts contract wiring

**Why last:** the service is fully working and tested; now expose it across the three layers so the (future) renderer can reach it. This phase has no new business logic — it's the contract wiring (per `electron/CLAUDE.md` "the full loop").

**Files:**
- Create: `electron/ipc/settings.ipc.ts`
- Modify: `electron/ipc/index.ts`
- Modify: `electron/preload.ts`
- Modify: `src/env.d.ts`

- [ ] **Step 1: IPC handlers** `electron/ipc/settings.ipc.ts` (thin adapters → service; mirror `sessions.ipc.ts`)

```ts
import { ipcMain } from "electron";
import * as settingsService from "../services/settings.service";

export function registerSettingsHandlers(): void {
  ipcMain.handle("settings:get", (_e, projectPath?: string) =>
    settingsService.getSettings(projectPath));

  ipcMain.handle("settings:watch", (_e, projectPath?: string) =>
    settingsService.watchSettings(projectPath));

  ipcMain.handle("settings:unwatch", () =>
    settingsService.unwatchSettings());
}
```

- [ ] **Step 2: Register** in `electron/ipc/index.ts` — add `import { registerSettingsHandlers } from "./settings.ipc";` next to the others and `registerSettingsHandlers();` inside `registerAllHandlers()`.

- [ ] **Step 3: Expose on `window.api`** in `electron/preload.ts` (push subscription filters the shared `push-event` channel by type, mirroring `onEvent`)

```ts
  getSettings: (projectPath?: string) => ipcRenderer.invoke("settings:get", projectPath),
  watchSettings: (projectPath?: string) => ipcRenderer.invoke("settings:watch", projectPath),
  unwatchSettings: () => ipcRenderer.invoke("settings:unwatch"),
  onSettingsChanged: (cb: (snapshot: import("../src/types/settings.types").SettingsSnapshot) => void) => {
    const handler = (_e: unknown, data: { type?: string; snapshot?: unknown }) => {
      if (data?.type === "settings_changed" && data.snapshot) {
        cb(data.snapshot as import("../src/types/settings.types").SettingsSnapshot);
      }
    };
    ipcRenderer.on("push-event", handler);
    return () => { ipcRenderer.removeListener("push-event", handler); };
  },
```
> The renderer-facing types live in `src/` for `env.d.ts` to import (`import("./types/settings.types")`). The backend `settings.types.ts` lives in `electron/types/`. To keep one source of truth, **re-export** the type for the renderer: add `src/types/settings.types.ts` that re-exports from the electron types, OR import the electron path in `env.d.ts` if the existing pattern allows it. Check how other shared types are referenced in `env.d.ts` (they use `import("./types/…")` against `src/types`) and follow the **same** convention — most likely add a thin `src/types/settings.types.ts` barrel that `export * from` / re-declares the same shapes, matching how `session.types`/`events.types` are surfaced to the front. Resolve this concretely during the phase; do not leave a dangling import path.

- [ ] **Step 4: Type the contract** in `src/env.d.ts` (inside the `window.api` interface)

```ts
    getSettings: (projectPath?: string) => Promise<import("./types/settings.types").SettingsSnapshot>;
    watchSettings: (projectPath?: string) => Promise<void>;
    unwatchSettings: () => Promise<void>;
    onSettingsChanged: (cb: (snapshot: import("./types/settings.types").SettingsSnapshot) => void) => () => void;
```

- [ ] **Step 5: Full gate** — `npm run typecheck` (0; this now verifies the `env.d.ts` import path resolves), `npm run lint:fix && npm run lint` (0/0; `env.d.ts` is in `src/`), `npm run test` (all suites green), `npx electron-vite build` (succeeds, compiles preload + ipc).

- [ ] **Step 6: Commit**
```bash
git add electron/ipc/settings.ipc.ts electron/ipc/index.ts electron/preload.ts src/env.d.ts
# (+ src/types/settings.types.ts if a renderer-side barrel was added)
git commit -m "feat(settings): IPC + preload + env.d.ts contract (get/watch/unwatch/onChanged)"
```

---

## Done criteria

- All four phases committed separately, each gate-clean.
- `npm run test` green (merge unit suite + service temp-dir suite incl. the live-change test).
- `npx electron-vite build` succeeds.
- The two open items (userLocal precedence + managed path) are **confirmed**, not assumed, and any divergence from the spec is reflected in both the code and the spec.
- No renderer/UI work, no writes to settings, no persistence to `data.db` — strictly the backend `read + merge + watch + broadcast` slice.

## Out of scope (later slices — do not start)

- Any renderer / UI (display, zustand store, components).
- Writing/editing settings.
- Per-leaf (deep-path) provenance.
- `~/.claude.json` (runtime/app state) and `keybindings.json`.
- Other `~/.claude` concepts (agents, skills, memory) — separate slices reusing this pattern.
- Persistence / settings change history.
