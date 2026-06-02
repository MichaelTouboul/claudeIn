# Agents Mirror (backend) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A backend-only, **additive** "agents mirror" that reads the **union** of user (`~/.claude/agents`) and project (`<projectPath>/.claude/agents`) agents into a lightweight `AgentSummary[]` (project shadows user on name collision; the shadowed user agent stays in the list marked `shadowed: true`), watches both dirs recursively, and broadcasts `agents_changed` live whenever the snapshot changes. Heavy content (body / memory files / annex files) stays on-demand via the **existing** `getAgent` IPC — it is **not** in the live snapshot. No DB, no renderer wiring, no persistence; the existing readers (`agent.service.ts`, `project.service.getProjectAgents`), all CRUD, and the current `agents:*` IPC are **left untouched**.

**Architecture:** Second slice of the "`~/.claude` as a live source of truth" refactor. It **reuses the exact pattern proven by the settings slice** (already merged on `main`): a **pure** logic file (`agents.union.ts`, filesystem-free, unit-tested, mirroring `settings.merge.ts`) split from a **service-with-watch** file (`agents.mirror.ts`, owns disk reads + the in-RAM snapshot + watchers + broadcast, mirroring `settings.service.ts`). The split keeps both files well under the 300-line limit and lets the union test run with zero I/O.

**Watch difference vs. settings:** the settings slice watches a flat parent directory with a filename filter (`session.service.ts` idiom). Agents live in **nested subfolders** (`getAllAgents`/`findAgentsInDir` walk recursively), so the mirror watches with **`fs.watch(dir, { recursive: true })`** and filters callbacks to `.md` files. Recursive `fs.watch` is supported on macOS (the target platform) — this is confirmed empirically in Phase 3, Step 0 before the watch code is finalized.

**Spec (source of truth):** `docs/superpowers/specs/2026-06-02-agents-mirror-backend-design.md`

**Tech Stack:** Electron, Node `fs`, `gray-matter` (frontmatter parsing, already a dep), Vitest (`@vitest-environment node`), TypeScript (no `any`).

---

## ⚠️ Execution discipline (read before starting)

1. **Isolated worktree only.** All code work runs in an **isolated git worktree subagent**, never directly on `main`. The worktree needs a tracked `.claude/settings.json` so git operations work inside it.
2. **Phase = test + commit unit.** Each phase below is independently testable and committable. **Verify the gate, then commit, before moving to the next phase.** Never batch multiple phases into one commit (hard user preference).
3. **Per-phase gate** (run the subset relevant to the files touched):
   - `npm run test -- <pattern>` → relevant Vitest tests green.
   - `npx electron-vite build` → succeeds (this is what actually compiles the `electron/` main-process code).
   - `npm run typecheck` → **0 errors** (only meaningful once `src/` is touched — Phase 4).
   - `npm run lint:fix && npm run lint` → **0 errors / 0 warnings** (only meaningful once `src/` is touched — Phase 4).
4. **Lint scope caveat (important).** ESLint **ignores `electron/**`** and `npm run typecheck` is scoped to `tsconfig.web.json` (`src/` only). So for **Phases 1–3 (backend-only files)** the real correctness gate is **`npx electron-vite build`** (esbuild-compiles the main process) **plus the Vitest tests**. The CLAUDE.md conventions for `electron/` (**no `any`**, **named imports only**, **300-line hard limit**) are **not auto-enforced by lint** there — the subagent must uphold them **by hand** and confirm each new/edited `electron/` file is < 300 lines. **Phase 4 touches `src/`** (`src/env.d.ts` + `src/types/agents-mirror.types.ts`), so `typecheck` **and** `lint` **do** apply and must be 0/0 there.
5. **Two flagged items to resolve — do NOT assume silently.** The spec flags these; resolve them in the named phase and **record the decision in that phase's commit body**:
   - **(a) Stable list order for the union** — resolved in **Phase 1** (see Phase 1, Step 0). The chosen order is **project agents first, then user agents, each group sorted by `id` (frontmatter `name`) ascending**. This keeps the broadcast diff stable and is asserted in the union test.
   - **(b) Recursive `fs.watch` on macOS** — confirmed in **Phase 3, Step 0** before the watch code is finalized.

---

## File structure

```
electron/types/agents-mirror.types.ts   ← AgentScope, AgentSummary, AgentsSnapshot (reuses AgentFrontmatter)
electron/services/agents.union.ts        ← PURE union + shadowing (no fs) — unit-tested
electron/services/agents.union.test.ts
electron/services/agents.mirror.ts        ← scan + union + getAgents + watch + debounced broadcast
electron/services/agents.mirror.test.ts
electron/ipc/agents.ipc.ts                ← + agents:mirror:get / :watch / :unwatch handlers (MODIFIED — existing file)
electron/preload.ts                       ← + getAgentsMirror / watchAgents / unwatchAgents / onAgentsChanged (MODIFIED)
src/env.d.ts                              ← + window.api signatures (MODIFIED)
src/types/agents-mirror.types.ts          ← renderer re-export barrel (NEW)
```

**Deliberate split (300-line limit):** `agents.union.ts` holds the pure union + shadowing logic (key by `id`, resolve collisions, mark `shadowed`, stable order) and is filesystem-free so it can be unit-tested in isolation; `agents.mirror.ts` holds everything that touches disk (the recursive `.md` scan into `AgentSummary`, the module-level snapshot, recursive watchers, debounce, and `broadcast`). Keeping them separate keeps both comfortably under 300 lines and lets the union test run with zero I/O — exactly the `settings.merge.ts` / `settings.service.ts` split.

**Do NOT modify** (the mirror builds *near*, not *on top of*, these): `electron/services/agent.service.ts`, `electron/services/project.service.ts` (`findAgentsInDir`, `countMdFiles`, the `memory/` skip + `name`-required rule are the **reference behavior to replicate**, not to call), the existing `agents:*` handlers in `agents.ipc.ts` (only **add** new handlers), the existing `getAgent` / `getAgents` (`agents:list`) preload+`env.d.ts` entries. Note: `window.api.getAgents` is **already taken** by the existing `agents:list` reader, which is why the new method is named **`getAgentsMirror`** (`agents:mirror:get`) — no collision.

---

## Phase 1 — Types + pure union/shadowing logic + unit test

**Why first:** the union + shadowing is the core of the domain and is testable with zero filesystem — a fast, deterministic foundation everything else builds on (mirrors the settings Phase 1: types + pure `mergeLayers`).

**Files:**
- Create: `electron/types/agents-mirror.types.ts`
- Create: `electron/services/agents.union.test.ts`
- Create: `electron/services/agents.union.ts`

- [ ] **Step 0: Lock the stable list order (flagged item a).** Decision (record in this phase's commit body): the union returns **project agents first, then user agents**, and **within each group sorted by `id` ascending** (`localeCompare`). Rationale: project agents are the active/primary ones in scope (they shadow user), so surfacing them first matches intent; sorting by `id` makes the order fully deterministic regardless of filesystem read order, which keeps the `JSON.stringify` diff in Phase 3 stable. This order is **asserted** in the union test (Step 2). If implementation reveals a better order, change it here and update the test + this decision — do not leave it implicit.

- [ ] **Step 1: Define the data contract** in `electron/types/agents-mirror.types.ts`

Mirror the spec verbatim. Reuse `AgentFrontmatter` from `agent.types` (do **not** redefine it). Use the `as const` object + derived union per the root TypeScript rules (no enum):

```ts
import type { AgentFrontmatter } from './agent.types';

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

> File-naming note: this file legitimately holds **both** an `interface` set and an `as const`/`type` pair — exactly like `settings.types.ts`. The repo's existing `types/*.types.ts` files co-locate interfaces and types under the `.types.ts` suffix, so `agents-mirror.types.ts` is the correct single barrel here — do not split by kind.

- [ ] **Step 2: Write the failing unit test** `electron/services/agents.union.test.ts`

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { unionAgents } from './agents.union';
import type { AgentSummary } from '../types/agents-mirror.types';

function summary(id: string, scope: AgentSummary['scope']): AgentSummary {
  return {
    id,
    scope,
    filePath: `/fake/${scope}/${id}.md`,
    relativePath: `${id}.md`,
    folder: '',
    frontmatter: { name: id, description: `${id} desc` },
    subAgents: [],
    shadowed: false,
  };
}

describe('unionAgents', () => {
  it('no collision → every agent active (shadowed:false), all present', () => {
    const result = unionAgents([summary('alpha', 'user')], [summary('beta', 'project')]);
    expect(result.map((a) => a.id)).toEqual(['beta', 'alpha']); // project group first, then user
    expect(result.every((a) => a.shadowed === false)).toBe(true);
  });

  it('name collision → project wins (active), user kept but shadowed:true', () => {
    const result = unionAgents([summary('dup', 'user')], [summary('dup', 'project')]);
    const proj = result.find((a) => a.scope === 'project' && a.id === 'dup');
    const usr = result.find((a) => a.scope === 'user' && a.id === 'dup');
    expect(proj?.shadowed).toBe(false);
    expect(usr?.shadowed).toBe(true);   // shadowed user agent stays in the list
    expect(result).toHaveLength(2);     // both kept, none dropped
  });

  it('stable order: project group first then user group, each sorted by id ascending', () => {
    const result = unionAgents(
      [summary('zeta', 'user'), summary('alpha', 'user')],
      [summary('yankee', 'project'), summary('bravo', 'project')],
    );
    expect(result.map((a) => `${a.scope}:${a.id}`)).toEqual([
      'project:bravo',
      'project:yankee',
      'user:alpha',
      'user:zeta',
    ]);
  });

  it('empty inputs → empty output', () => {
    expect(unionAgents([], [])).toEqual([]);
  });

  it('does not mutate its inputs (returns fresh summaries with shadowed set)', () => {
    const user = [summary('dup', 'user')];
    unionAgents(user, [summary('dup', 'project')]);
    expect(user[0].shadowed).toBe(false); // original untouched
  });
});
```

- [ ] **Step 2b: Run the test to confirm it FAILS** — `npm run test -- agents.union` → cannot resolve `./agents.union`.

- [ ] **Step 3: Implement `electron/services/agents.union.ts`** (pure, no `fs`, no Electron imports)

Public interface:
```ts
export function unionAgents(
  userAgents: AgentSummary[],
  projectAgents: AgentSummary[],
): AgentSummary[];
```
Semantics (per spec "Union & shadowing"):
- Agents are keyed by `id` (frontmatter `name`).
- Build the set of project ids. A **user** agent whose `id` is in the project set is **shadowed** → return it with `shadowed: true`; otherwise `shadowed: false`. **Project** agents are always `shadowed: false`.
- **Keep both** on collision — the shadowed user agent is NOT dropped (the UI decides whether to dim it).
- **Do not mutate inputs**: produce fresh summary objects (e.g. `{ ...agent, shadowed }`).
- **Order:** project group first, then user group; **within each group sort by `id` ascending** (`a.id.localeCompare(b.id)`). This is the locked stable order (Step 0). Comfortably under 300 lines.

- [ ] **Step 4: Run the test to confirm it PASSES** — `npm run test -- agents.union` → all green.

- [ ] **Step 5: Gate** — `npx electron-vite build` (succeeds). `npm run test -- agents.union` (green). (No `src/` touched yet, so typecheck/lint are not the gate this phase — but a quick `npm run typecheck` should still pass since nothing in `src/` changed.) **By hand:** confirm `agents-mirror.types.ts` and `agents.union.ts` are each < 300 lines, no `any`, named imports only.

- [ ] **Step 6: Commit**
```bash
git add electron/types/agents-mirror.types.ts electron/services/agents.union.ts electron/services/agents.union.test.ts
git commit -m "feat(agents): mirror types + pure union/shadowing with unit tests"
```
Record the locked list-order decision (project-first, then user, each sorted by id) in the commit body.

---

## Phase 2 — Scan + `getAgents(projectPath?)` + temp-dir tests

**Why now:** with the union proven, add the filesystem scan that turns `.md` files into `AgentSummary[]` and assembles an `AgentsSnapshot`. No watching yet — a pure one-shot read, tested against temporary directories with `process.env.HOME` redirected (exactly the `settings.service.test.ts` style).

**Files:**
- Create: `electron/services/agents.mirror.test.ts`
- Create: `electron/services/agents.mirror.ts`

- [ ] **Step 1: Design the scan + read surface** (`agents.mirror.ts`)

Public interface for this phase:
```ts
export function getAgents(projectPath?: string): AgentsSnapshot;
```
Behavior (per spec "Read & scope"):
- Resolve the user agents dir as `path.join(HOME, '.claude', 'agents')` where `const HOME = process.env.HOME || os.homedir();` — **resolved at call time** (not module load), so tests can redirect via `process.env.HOME`, mirroring `session.service.ts`. (The existing `agent.service.ts` reads `process.env.HOME!` at module load — do **not** copy that; resolve at call time for testability.)
- Scan the user dir → `AgentSummary[]` with `scope: 'user'`. If `projectPath` is given, scan `<projectPath>/.claude/agents` → `AgentSummary[]` with `scope: 'project'`.
- **Scan rule (replicate `findAgentsInDir`/`countMdFiles`, do NOT call them):** walk the dir recursively; **skip any directory named `memory`**; for each `.md` file, `matter(raw)`; **skip files with no `data.name`** in frontmatter. Build the summary **without** reading body/memory/annex — set:
  - `id = frontmatter.name`
  - `frontmatter = data as AgentFrontmatter`
  - `relativePath = path.relative(<scanRoot>, fullPath)`, `folder = path.dirname(relativePath)` (`'' ` when `'.'`)
  - `subAgents` = `Array.isArray(fm.subAgents) && fm.subAgents.length > 0 ? fm.subAgents : extractSubAgents(body)` — replicate the existing precedence. (`extractSubAgents` greps the body for `` `tw-…` `` backtick refs; the body is parsed by `matter` but **not stored** on the summary — reading it for sub-agent extraction is fine, it just isn't surfaced.)
  - `shadowed: false` (the union sets the real value)
- Call `unionAgents(userSummaries, projectSummaries)` and return `{ projectPath: projectPath ?? null, agents }`.
- **Never throws** (faithful-mirror rule): a missing dir contributes an empty list; a malformed/`name`-less `.md` is skipped; wrap per-file parse in try/catch like the reference readers.
- Reads are **synchronous** (`fs.readFileSync` + `matter`) — consistent with the settings service; the IPC contract is `Promise<…>` only because Electron wraps it.

> **Scope of the parse:** the summary is intentionally lightweight. Do **not** load `memory/` files, `.env`/annex files, or store the body — that heavy content stays on-demand via the existing `getAgent`. Reading the body in-memory solely to run `extractSubAgents` is acceptable; just don't put it on `AgentSummary`.

- [ ] **Step 2: Write the failing test** `electron/services/agents.mirror.test.ts` (temp dirs, `process.env.HOME` redirected — `settings.service.test.ts` skeleton)

```ts
// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Mock broadcast now so it's in place for Phase 3's watch test too.
vi.mock('./broadcast', () => ({ broadcast: vi.fn() }));

import { getAgents } from './agents.mirror';

let tmpHome: string;
let prevHome: string | undefined;
let userAgentsDir: string;

beforeEach(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'cam-agents-'));
  prevHome = process.env.HOME;
  process.env.HOME = tmpHome;
  userAgentsDir = path.join(tmpHome, '.claude', 'agents');
  fs.mkdirSync(userAgentsDir, { recursive: true });
});

afterEach(() => {
  process.env.HOME = prevHome;
  fs.rmSync(tmpHome, { recursive: true, force: true });
});

function writeAgent(dir: string, file: string, frontmatter: Record<string, unknown>, body = 'x') {
  fs.mkdirSync(dir, { recursive: true });
  const fm = Object.entries(frontmatter).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n');
  fs.writeFileSync(path.join(dir, file), `---\n${fm}\n---\n${body}\n`);
}

describe('agents.mirror getAgents', () => {
  it('reads user .md frontmatter into lightweight summaries (no body/memory/annex)', () => {
    writeAgent(userAgentsDir, 'alpha.md', { name: 'alpha', description: 'A' });
    const snap = getAgents();
    expect(snap.projectPath).toBeNull();
    const alpha = snap.agents.find((a) => a.id === 'alpha');
    expect(alpha?.scope).toBe('user');
    expect(alpha?.frontmatter.name).toBe('alpha');
    expect(alpha).not.toHaveProperty('body');        // heavy content excluded
    expect(alpha).not.toHaveProperty('memoryFiles');
  });

  it('skips the memory/ subdirectory and .md files lacking a name', () => {
    writeAgent(userAgentsDir, 'good.md', { name: 'good', description: 'G' });
    writeAgent(path.join(userAgentsDir, 'memory'), 'note.md', { name: 'should-be-skipped', description: 'x' });
    writeAgent(userAgentsDir, 'nameless.md', { description: 'no name field' });
    const ids = getAgents().agents.map((a) => a.id);
    expect(ids).toEqual(['good']);
  });

  it('walks nested folders and sets folder/relativePath', () => {
    writeAgent(path.join(userAgentsDir, 'sub'), 'nested.md', { name: 'nested', description: 'N' });
    const nested = getAgents().agents.find((a) => a.id === 'nested');
    expect(nested?.folder).toBe('sub');
    expect(nested?.relativePath).toBe(path.join('sub', 'nested.md'));
  });

  it('project scope: adds project agents and project shadows user on name collision', () => {
    const projDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cam-proj-'));
    const projAgentsDir = path.join(projDir, '.claude', 'agents');
    writeAgent(userAgentsDir, 'dup.md', { name: 'dup', description: 'user version' });
    writeAgent(userAgentsDir, 'only-user.md', { name: 'only-user', description: 'U' });
    writeAgent(projAgentsDir, 'dup.md', { name: 'dup', description: 'project version' });

    const snap = getAgents(projDir);
    expect(snap.projectPath).toBe(projDir);
    const projDup = snap.agents.find((a) => a.id === 'dup' && a.scope === 'project');
    const userDup = snap.agents.find((a) => a.id === 'dup' && a.scope === 'user');
    expect(projDup?.shadowed).toBe(false);
    expect(userDup?.shadowed).toBe(true);
    expect(snap.agents.find((a) => a.id === 'only-user')?.shadowed).toBe(false);
    fs.rmSync(projDir, { recursive: true, force: true });
  });

  it('missing user agents dir → empty list, never throws', () => {
    fs.rmSync(userAgentsDir, { recursive: true, force: true });
    expect(() => getAgents()).not.toThrow();
    expect(getAgents().agents).toEqual([]);
  });
});
```

- [ ] **Step 2b: Run to confirm FAIL** — `npm run test -- agents.mirror` (cannot resolve `getAgents`).

- [ ] **Step 3: Implement the scan + read logic** in `agents.mirror.ts` (watch/broadcast deferred to Phase 3 — leave a clear section comment where they'll go, as the settings service does).

- [ ] **Step 4: Run to confirm PASS** — `npm run test -- agents.mirror` → green. Re-run `npm run test -- agents` to keep the union suite green too.

- [ ] **Step 5: Gate** — `npx electron-vite build` (succeeds), `npm run test -- agents` (all green). **By hand:** confirm `agents.mirror.ts` < 300 lines (if it's getting close, that's a signal Phase 3's watch code should be extracted to a sibling `agents.watch.ts` — see the Phase 3 note), no `any`, named imports only.

- [ ] **Step 6: Commit**
```bash
git add electron/services/agents.mirror.ts electron/services/agents.mirror.test.ts
git commit -m "feat(agents): scan user+project dirs into a shadowed summary snapshot (+ temp-dir tests)"
```

---

## Phase 3 — Recursive watch + debounced live broadcast

**Why now:** the snapshot is correct; make it **live**. Watch both agents dirs recursively, debounce, recompute, and push `agents_changed` only when the snapshot actually changed.

**Files:**
- Modify: `electron/services/agents.mirror.ts` (add watch lifecycle + module-level snapshot + diff + broadcast)
- Modify: `electron/services/agents.mirror.test.ts` (add change-event + diff-guard tests)

> **300-line guard:** if adding the watch lifecycle pushes `agents.mirror.ts` toward 300 lines, extract the watcher mechanics into a sibling `electron/services/agents.watch.ts` (start/stop/debounce, calling back into the mirror to recompute). Decide at implementation time based on the actual line count; prefer keeping scan + watch together if it comfortably fits (the settings service did).

- [ ] **Step 0: Confirm recursive `fs.watch` on macOS (flagged item b).** Before finalizing the watch code, verify empirically that `fs.watch(dir, { recursive: true })` fires for a `.md` write in a **nested** subdirectory on this machine (darwin). Quick check: a tiny throwaway script (or a temporary test) that watches a temp dir recursively, writes `sub/x.md`, and asserts the callback fires. Node's docs state `recursive` is supported on macOS and Windows — confirm it holds here, since agents nest in folders and the non-recursive `session.service.ts` watch would miss nested edits. Record the confirmation in this phase's commit body. If (unexpectedly) recursive watch is unreliable, fall back to enumerating subdirectories and watching each (note the deviation here and in the spec) — but the expectation is recursive works.

- [ ] **Step 1: Add the watch surface** (mirroring `settings.service.ts` `watchSettings`/`unwatchSettings`)

Public interface:
```ts
export function watchAgents(projectPath?: string): void;
export function unwatchAgents(): void;
```
Behavior (per spec "Live flow"):
- `watchAgents` records the current scope and starts `fs.watch(dir, { recursive: true }, cb)` on `~/.claude/agents/` and (when scoped) `<projectPath>/.claude/agents/`. Each callback **filters to `.md` files** (`filename?.endsWith('.md')`) — ignore non-`.md` churn. (No need to special-case `memory/` in the watcher: a change under `memory/` may trigger a recompute, but the scan skips `memory/`, so the snapshot is unchanged and the diff guard suppresses the broadcast.)
- Keep watchers in a module-level `Map<string, fs.FSWatcher>` keyed by dir (like `settings.service.ts`/`session.service.ts`). Guards: **skip a dir that doesn't exist** (`fs.existsSync`) without throwing; wrap `fs.watch` in try/catch (perms/transient); **re-entrancy guard** — if already watching, call `unwatchAgents()` first so a second `watchAgents` **replaces** the current scope rather than double-watching.
- On a matching change: **debounce ~150 ms** (single trailing timer) → `getAgents(currentScope)` → serialize and compare to the module-level **last snapshot** (`JSON.stringify` deep-equality, exactly as settings) → only if **different**, store it and `broadcast({ type: 'agents_changed', snapshot })`.
- Seed `lastSerialized = JSON.stringify(getAgents(currentScope))` in `watchAgents` so the first real change diffs against the current state.
- `unwatchAgents()` closes all watchers, clears the debounce timer, and **resets** the stored snapshot/scope (`currentScope = undefined`, `lastSerialized = null`).
- The snapshot is **RAM-only**, never persisted (like `cachedProjects` / the settings snapshot).

> **Broadcast shape:** reuse the existing `broadcast` from `./broadcast` exactly as `settings.service.ts` does — it sends `{ ...data }` over the single `push-event` channel. Do **NOT** add a new channel. The renderer's `onAgentsChanged` (Phase 4 preload) filters by `data.type === 'agents_changed'`.

- [ ] **Step 2: Add the change-event + diff-guard tests** to `agents.mirror.test.ts`

The `vi.mock('./broadcast', …)` is already at the top of the file (added in Phase 2). Add a `waitFor(predicate, timeout)` poller (copy the one from `settings.service.test.ts`), a `changedPushes()` helper that filters `broadcastMock.mock.calls` to `type === 'agents_changed'`, and **always `unwatchAgents()` in `afterEach`** to avoid leaking watchers/timers. Add `broadcastMock.mockClear()` to `beforeEach`.

```ts
import { broadcast } from './broadcast';
import { getAgents, unwatchAgents, watchAgents } from './agents.mirror';
const broadcastMock = vi.mocked(broadcast);

it('broadcasts a recomputed snapshot when a watched .md changes (incl. nested)', async () => {
  watchAgents();
  writeAgent(path.join(userAgentsDir, 'sub'), 'fresh.md', { name: 'fresh', description: 'F' });
  await waitFor(() => changedPushes().some(
    (d) => d.snapshot?.agents.some((a) => a.id === 'fresh'),
  ));
  const push = changedPushes().find((d) => d.snapshot?.agents.some((a) => a.id === 'fresh'));
  expect(push?.snapshot?.agents.find((a) => a.id === 'fresh')?.scope).toBe('user');
});

it('does not re-broadcast when the snapshot is unchanged (diff guard)', async () => {
  writeAgent(userAgentsDir, 'alpha.md', { name: 'alpha', description: 'A' });
  watchAgents();
  // Re-write byte-identical content → snapshot unchanged → no push.
  writeAgent(userAgentsDir, 'alpha.md', { name: 'alpha', description: 'A' });
  await new Promise((r) => setTimeout(r, 400)); // past the 150ms debounce
  expect(changedPushes().length).toBe(0);
});
```
Assert: (1) a `agents_changed` push fires after a (nested) `.md` write and the pushed `snapshot.agents` includes the new agent; (2) rewriting identical content produces **no** push (diff guard). Note the second test seeds `alpha.md` **before** `watchAgents()` so the baseline already contains it — the identical rewrite must not change the snapshot.

- [ ] **Step 3: Run to confirm PASS** — `npm run test -- agents` (union + mirror suites green).

- [ ] **Step 4: Gate** — `npx electron-vite build` (succeeds), `npm run test -- agents` (green). **By hand:** confirm every `electron/` agents file < 300 lines (extract `agents.watch.ts` now if needed), no `any`, named imports only.

- [ ] **Step 5: Commit**
```bash
git add electron/services/agents.mirror.ts electron/services/agents.mirror.test.ts
# (+ electron/services/agents.watch.ts if the split was needed)
git commit -m "feat(agents): recursive watch + debounced live broadcast on change"
```
Record the confirmed macOS recursive-`fs.watch` fact in the commit body.

---

## Phase 4 — IPC + preload + env.d.ts + src/types barrel (contract wiring)

**Why last:** the service is fully working and tested; now expose it across the layers so the (future) renderer can reach it. No new business logic — pure contract wiring (per `electron/CLAUDE.md` "the full loop"). **This phase touches `src/`**, so `typecheck` **and** `lint` are now real gates (0 errors / 0 warnings).

**Files:**
- Modify: `electron/ipc/agents.ipc.ts` (ADD new handlers next to the existing `agents:*` — do not touch the existing ones)
- Modify: `electron/preload.ts`
- Modify: `src/env.d.ts`
- Create: `src/types/agents-mirror.types.ts` (renderer re-export barrel)

- [ ] **Step 1: Add the mirror IPC handlers** to the existing `electron/ipc/agents.ipc.ts` (thin adapters → `agents.mirror`; same domain, no collision with `agents:list`/`agents:get` etc.)

```ts
import * as agentsMirror from "../services/agents.mirror";
// ... inside registerAgentHandlers(), alongside the existing agents:* handles:
  ipcMain.handle("agents:mirror:get", (_e, projectPath?: string) =>
    agentsMirror.getAgents(projectPath));
  ipcMain.handle("agents:mirror:watch", (_e, projectPath?: string) =>
    agentsMirror.watchAgents(projectPath));
  ipcMain.handle("agents:mirror:unwatch", () =>
    agentsMirror.unwatchAgents());
```
No change to `electron/ipc/index.ts` is needed — `registerAgentHandlers` is already registered there; the new channels ride inside the existing function.

- [ ] **Step 2: Create the renderer re-export barrel** `src/types/agents-mirror.types.ts` (exactly like `src/types/settings.types.ts` re-exports the electron settings types — keeps one source of truth)

```ts
export type {
  AgentScope,
  AgentSummary,
  AgentsSnapshot,
} from "../../electron/types/agents-mirror.types";
```

- [ ] **Step 3: Expose on `window.api`** in `electron/preload.ts` (push subscription filters the shared `push-event` channel by `type`, mirroring `onSettingsChanged`/`onEvent`). Name the getter **`getAgentsMirror`** to avoid colliding with the existing `getAgents` (`agents:list`).

```ts
  getAgentsMirror: (projectPath?: string) => ipcRenderer.invoke("agents:mirror:get", projectPath),
  watchAgents: (projectPath?: string) => ipcRenderer.invoke("agents:mirror:watch", projectPath),
  unwatchAgents: () => ipcRenderer.invoke("agents:mirror:unwatch"),
  onAgentsChanged: (cb: (snapshot: import("../src/types/agents-mirror.types").AgentsSnapshot) => void) => {
    const handler = (_e: unknown, data: { type?: string; snapshot?: unknown }) => {
      if (data?.type === "agents_changed" && data.snapshot) {
        cb(data.snapshot as import("../src/types/agents-mirror.types").AgentsSnapshot);
      }
    };
    ipcRenderer.on("push-event", handler);
    return () => { ipcRenderer.removeListener("push-event", handler); };
  },
```

- [ ] **Step 4: Type the contract** in `src/env.d.ts` (inside the `window.api` interface, alongside the existing `getAgents`/`getAgent` and the settings entries). Import from the **`src/types`** barrel (`./types/agents-mirror.types`), matching how `getSettings` references `./types/settings.types`.

```ts
    getAgentsMirror: (projectPath?: string) => Promise<import("./types/agents-mirror.types").AgentsSnapshot>;
    watchAgents: (projectPath?: string) => Promise<void>;
    unwatchAgents: () => Promise<void>;
    onAgentsChanged: (cb: (snapshot: import("./types/agents-mirror.types").AgentsSnapshot) => void) => () => void;
```

- [ ] **Step 5: Full gate** — `npm run typecheck` (**0 errors**; now verifies the `env.d.ts` + barrel import paths resolve), `npm run lint:fix && npm run lint` (**0 errors / 0 warnings**; `env.d.ts` and the barrel are in `src/`), `npm run test` (all suites green), `npx electron-vite build` (succeeds; compiles preload + ipc). **By hand:** confirm no `any`, named imports only.

- [ ] **Step 6: Commit**
```bash
git add electron/ipc/agents.ipc.ts electron/preload.ts src/env.d.ts src/types/agents-mirror.types.ts
git commit -m "feat(agents): mirror IPC + preload + env.d.ts contract (get/watch/unwatch/onChanged)"
```

---

## Done criteria

- All four phases committed separately, each gate-clean.
- `npm run test` green (union unit suite + mirror temp-dir suite incl. the live-change + diff-guard tests).
- `npx electron-vite build` succeeds; `npm run typecheck` and `npm run lint` are 0/0 (Phase 4).
- The two flagged items are **resolved, not assumed**: (a) the stable list order (project-first, then user, each sorted by `id`) is implemented and asserted; (b) recursive `fs.watch` on macOS is confirmed — both recorded in their phase commit bodies.
- **Additive & untouched:** `agent.service.ts`, `project.service.getProjectAgents`, the existing `agents:*` CRUD/IPC, and the existing `getAgents`/`getAgent` preload+`env.d.ts` entries are unchanged. No DB writes, no renderer/UI, no persistence — strictly the backend `read + union + watch + broadcast` slice.

## Out of scope (later slices — do not start)

- Renderer wiring (a dashboard list consuming the mirror; switching off the pull readers).
- Full agent content (body / memory / annex) in the live snapshot — stays on-demand via the existing `getAgent`.
- Unifying or removing the existing `project.service.getProjectAgents` / `agent.service` readers and the `agents:*` CRUD.
- Provenance richer than the `shadowed` flag.
- Skills / memory / MCP mirrors — separate slices reusing this pattern.
