# Onboarding — Discovery & LLM Understanding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. **Project note:** standard execution path is the lean dev-loop (`.claude/workflows/dev-loop.js`, invoked by `scriptPath`) — one run per phase, gate-verified, merged to `main`. Each Phase is a self-contained dev-loop input.

**Goal:** A first-run onboarding that discovers repos with root-level `.claude` (+ detects plugin dirs like `.a5c`), runs an agentic `claude --print` per selected scope to explore `.claude` and emit a narrative profile, and persists those profiles for later (pillar-5) consumers.

**Architecture:** Backend services (`onboarding.service` discovery, `profile.service` agentic ingestion + SQLite persistence) exposed over IPC, consumed by a renderer first-run `OnboardingWizard` and a read-only profile view. Reuses `project.service` scan constants, `spawn.service` (`claude --print`, subscription auth), `db.ts` (sql.js), the IPC `domain:action` pattern, and the `MarkdownBody` `_ui` primitive.

**Tech Stack:** Electron main (Node, fs/promises, sql.js), TypeScript (no `any`), React renderer (JSX transform), Vitest. `@/` alias. 300-line hard limit. Spec: `docs/superpowers/specs/2026-06-09-onboarding-discovery-understanding-design.md`.

---

## File Structure

**Create (backend):**
- `electron/types/onboarding.types.ts` — `Candidate`, `ScopeProfile` (+ a renderer mirror `src/types/onboarding.types.ts` re-exporting them).
- `electron/services/onboarding.service.ts` (+ `.test.ts`) — `scanCandidates()`.
- `electron/services/profile.service.ts` (+ `.test.ts`) — `ingestScope`, `getProfile`, `listProfiles`, `refreshProfile`.
- `electron/ipc/onboarding.ipc.ts` — IPC handlers.

**Create (renderer):**
- `src/components/Onboarding/OnboardingWizard/OnboardingWizard.tsx` (+ sub-steps `ScanStep.tsx`, `IngestStep.tsx`, `ingestStatus.ts` behavior map, + tests).
- `src/components/Onboarding/ProfileView/ProfileView.tsx` (+ test).
- `src/hooks/useOnboarding.ts` (+ test) — wraps the IPC calls + first-run gate.

**Modify:**
- `electron/services/db.ts` — add the `scope_profiles` table (mirror the existing table-creation pattern).
- `electron/ipc/index.ts` — `registerOnboardingHandlers()`.
- `electron/preload.ts` — expose the new `window.api` methods.
- `src/env.d.ts` — declare the new `window.api` methods.
- The renderer root/app shell — mount `OnboardingWizard` behind the first-run gate (locate the shell entry at execution time, e.g. `src/App.tsx`).

**Read for context before starting:**
- `electron/services/project.service.ts` — `scanForProjects`, `PROJECT_SCAN_DEPTH`, `PROJECT_SKIP_DIRS`, the `projectPath === HOME` user-scope special case, the `exists()` helper.
- `electron/services/spawn.service.ts` — how `claude --print` is spawned and stdout captured (the seam to reuse + stub in tests).
- `electron/services/db.ts` — table creation + query/persist pattern (sql.js).
- An existing IPC file (e.g. `electron/ipc/mcp.ipc.ts`) + `electron/ipc/index.ts` — the registration + handler pattern.
- An existing backend service test that builds an fs-fixture (e.g. `electron/services/mcp.mirror.test.ts`) — the temp-tree idiom.
- `src/components/_ui/MarkdownBody` — renders markdown.

---

## Phase 1 — Discovery (`onboarding.service.scanCandidates`)

**Files:** Create `electron/types/onboarding.types.ts`, `electron/services/onboarding.service.ts` (+ `.test.ts`).

**Types:**
```ts
export type Candidate = {
  path: string;                 // repo root; the user-scope sentinel for a root-level .claude
  scope: 'user' | 'project';
  hasClaude: true;
  plugins: string[];            // e.g. ['babysitter'] when .a5c present
};
```

### Task 1.1: `scanCandidates`

- [ ] **Step 1 — Write failing tests** (`onboarding.service.test.ts`), building a temp dir tree fixture (copy the temp-tree idiom from `mcp.mirror.test.ts`):
  - a dir with a root-level `.claude/` is returned as a `project` candidate;
  - a nested `.claude/` inside an already-found candidate is NOT a separate candidate (dedup / no-descend);
  - a dir under the skip-list (e.g. `node_modules`) is not scanned;
  - a dir containing both `.claude/` and `.a5c/` yields `plugins: ['babysitter']`;
  - the `HOME`-level / filesystem-root `.claude` is represented as a `user` scope candidate (mirror the `project.service` `=== HOME` special case).

> Make the scan root injectable (param defaulting to `HOME`) so the test can point it at the fixture root without touching `$HOME`.

- [ ] **Step 2 — Run, verify fail.** Run: `NODE_ENV=test npx vitest run electron/services/onboarding.service.test.ts` → FAIL (module missing).

- [ ] **Step 3 — Implement** `scanCandidates(root = HOME)`:
  - import `PROJECT_SCAN_DEPTH`, `PROJECT_SKIP_DIRS` from `./project.service` (do NOT re-derive).
  - walk depth-limited; when a dir contains `.claude`, record a `Candidate` and **do not descend further into it** (so nested `.claude` is excluded); detect plugin dirs (`const PLUGIN_DIRS: Record<string, string> = { '.a5c': 'babysitter' };`) → `plugins`.
  - map a root-level `.claude` (root itself / `=== HOME`) to `scope: 'user'`, else `'project'`.

- [ ] **Step 4 — Run, verify pass.**

- [ ] **Step 5 — Gate + commit**

```bash
bash .claude/hooks/gate.sh
git add electron/types/onboarding.types.ts electron/services/onboarding.service.ts electron/services/onboarding.service.test.ts
git commit -m "feat(onboarding): scanCandidates — repos with root-level .claude + plugin detection"
```

**Dev-loop input for Phase 1:** "Implement Phase 1 of docs/superpowers/plans/2026-06-09-onboarding-discovery-understanding.md: create electron/types/onboarding.types.ts (Candidate type) and electron/services/onboarding.service.ts `scanCandidates(root = HOME)`. Reuse PROJECT_SCAN_DEPTH + PROJECT_SKIP_DIRS from project.service (don't re-derive). Candidate = dir with root-level .claude; DO NOT descend into a found candidate (nested .claude excluded); detect plugin dirs via Record {'.a5c':'babysitter'}; map root-level/HOME .claude to user scope else project. Make the scan root an injectable param for tests. Strict TDD with a temp-dir fixture (copy the idiom from electron/services/mcp.mirror.test.ts). Tests: root-level .claude found; nested .claude not a separate candidate; skip-list respected; .a5c→plugins:['babysitter']; root→user scope. NODE_ENV=test npx vitest. Follow CLAUDE.md + electron/CLAUDE.md (no any; named imports). Gate green via bash .claude/hooks/gate.sh."

---

## Phase 2 — Persistence + agentic ingestion (`profile.service` + `scope_profiles`)

**Files:** Modify `electron/services/db.ts`; create `electron/services/profile.service.ts` (+ `.test.ts`); add `ScopeProfile` to `electron/types/onboarding.types.ts`.

**Type:**
```ts
export type ScopeProfile = {
  scopePath: string;
  scope: 'user' | 'project';
  profileMd: string;
  generatedAt: string;
};
```

### Task 2.1: `scope_profiles` table

- [ ] **Step 1 — Failing test** (extend `db.test.ts` if present, else assert via `profile.service` in 2.2): the table exists after init with columns `scope_path` (PK), `scope`, `profile_md`, `inputs_hash`, `generated_at`.
- [ ] **Step 2–4** — add to `db.ts` init (mirror existing `CREATE TABLE IF NOT EXISTS` pattern):
```sql
CREATE TABLE IF NOT EXISTS scope_profiles (
  scope_path TEXT PRIMARY KEY, scope TEXT NOT NULL, profile_md TEXT NOT NULL,
  inputs_hash TEXT NOT NULL, generated_at TEXT NOT NULL
);
```
- [ ] **Step 5 — Commit.**

### Task 2.2: `profile.service`

- [ ] **Step 1 — Failing tests** (`profile.service.test.ts`), **stubbing the spawn seam** so no real LLM/network runs:
  - `ingestScope(scopePath, scope, plugins)` invokes the `claude --print` spawn with `cwd === scopePath` and a prompt that mentions exploring `.claude` and the detected `plugins`; persists a row; returns a `ScopeProfile` whose `profileMd` is the (canned) stdout;
  - `getProfile(scopePath)` returns the stored profile; `null` when absent;
  - `listProfiles()` returns all;
  - `refreshProfile(scopePath)` re-runs ingest, overwrites the row, updates `generatedAt`;
  - `inputs_hash` differs when the `.claude` tree differs (hash of file paths + mtimes/sizes over the fixture).

> Stub by injecting the spawn function (dependency seam) or by pointing `spawn.service` at a fake `claude` per the repo's existing spawn-test approach — assert command/cwd/prompt, feed canned stdout. Deterministic, no network.

- [ ] **Step 2 — Run, verify fail.**

- [ ] **Step 3 — Implement** `profile.service.ts`: `ingestScope` builds the exploration prompt (per the spec), spawns `claude --print` with `cwd = scopePath`, captures stdout; computes `inputs_hash` over the `.claude` tree; upserts into `scope_profiles`. `getProfile`/`listProfiles`/`refreshProfile` query/mutate the table. Keep < 300 lines (split the hash helper into a sibling if needed).

- [ ] **Step 4 — Run, verify pass.**

- [ ] **Step 5 — Gate + commit**

```bash
bash .claude/hooks/gate.sh
git add electron/services/db.ts electron/services/profile.service.ts electron/services/profile.service.test.ts electron/types/onboarding.types.ts
git commit -m "feat(onboarding): profile.service — agentic ingest + scope_profiles persistence"
```

**Dev-loop input for Phase 2:** "Implement Phase 2 of docs/superpowers/plans/2026-06-09-onboarding-discovery-understanding.md: add the `scope_profiles` table to electron/services/db.ts (mirror its CREATE TABLE IF NOT EXISTS pattern), and create electron/services/profile.service.ts with `ingestScope`/`getProfile`/`listProfiles`/`refreshProfile` + the ScopeProfile type. ingestScope spawns `claude --print` (reuse spawn.service) with cwd=scopePath and a prompt to explore `.claude` + the detected plugins, captures stdout as profileMd, computes inputs_hash over the .claude tree (paths+mtimes), upserts the row. STUB the spawn seam in tests (assert command/cwd/prompt, feed canned stdout — no network, deterministic). Tests: ingest persists + returns profile; get/list round-trip; refresh overwrites + updates generatedAt; inputs_hash changes with the tree. Strict TDD, NODE_ENV=test. CLAUDE.md + electron/CLAUDE.md (no any; 300-line limit). Gate green."

---

## Phase 3 — IPC + contract

**Files:** Create `electron/ipc/onboarding.ipc.ts`; modify `electron/ipc/index.ts`, `electron/preload.ts`, `src/env.d.ts`; create `src/types/onboarding.types.ts` (re-export from `electron/types/onboarding.types.ts`).

### Task 3.1: handlers + contract

- [ ] **Step 1 — Failing test** (match how the repo tests IPC — if IPC handlers are unit-tested, assert each handler delegates to the service and returns the contract shape; otherwise cover the services and assert registration wiring): handlers for `onboarding:scan`, `onboarding:ingest`, `profiles:list`, `profiles:get`, `profiles:refresh` delegate to `onboarding.service`/`profile.service`.

- [ ] **Step 2 — Run, verify fail.**

- [ ] **Step 3 — Implement**:
  - `onboarding.ipc.ts` with `registerOnboardingHandlers()` wiring the five channels to the services (follow `mcp.ipc.ts`);
  - register it in `ipc/index.ts`;
  - add the methods to `preload.ts` (`getOnboardingScan`/`ingestScope`/`listProfiles`/`getProfile`/`refreshProfile` — match the app's `window.api` naming convention);
  - declare them in `src/env.d.ts` returning the mirrored types.

- [ ] **Step 4 — Run, verify pass.**

- [ ] **Step 5 — Gate + commit**

```bash
bash .claude/hooks/gate.sh
git add electron/ipc/onboarding.ipc.ts electron/ipc/index.ts electron/preload.ts src/env.d.ts src/types/onboarding.types.ts
git commit -m "feat(onboarding): IPC + window.api contract for scan/ingest/profiles"
```

**Dev-loop input for Phase 3:** "Implement Phase 3 of docs/superpowers/plans/2026-06-09-onboarding-discovery-understanding.md: create electron/ipc/onboarding.ipc.ts (registerOnboardingHandlers wiring onboarding:scan, onboarding:ingest, profiles:list, profiles:get, profiles:refresh to onboarding.service/profile.service — follow mcp.ipc.ts); register in ipc/index.ts; expose the methods in preload.ts (match window.api naming); declare them in src/env.d.ts; create src/types/onboarding.types.ts re-exporting the electron types. Test IPC the way the repo already does. Strict TDD; CLAUDE.md + electron/CLAUDE.md (no any; named imports; import type). Gate green."

---

## Phase 4 — Onboarding wizard (renderer)

**Files:** Create `src/hooks/useOnboarding.ts` (+test); `src/components/Onboarding/OnboardingWizard/` (`OnboardingWizard.tsx`, `ScanStep.tsx`, `IngestStep.tsx`, `ingestStatus.ts`, + tests); modify the app shell to mount it behind the first-run gate.

### Task 4.1: `ingestStatus` behavior map + `useOnboarding`

- [ ] **Step 1 — Failing test:** `IngestStatus = { Pending, Running, Done, Error } as const` has a `Record<IngestStatus, {label,...}>` entry for every value (no fallback chain). `useOnboarding` exposes `scan()`, `ingest(candidate)`, a per-scope status map, and an `isOnboarded` gate derived from `profiles:list` / a persisted flag.
- [ ] **Step 2–4** — implement the `as const` enum + map; `useOnboarding` wrapping the IPC (stub `window.api` in the test). **Step 5 — commit.**

### Task 4.2: `OnboardingWizard` + steps

- [ ] **Step 1 — Failing test** (`OnboardingWizard.test.tsx`, stub `window.api`): renders candidates from a stubbed `onboarding:scan` (path + plugin badges + checkboxes); selecting + "Add selected" calls `ingest` per selected scope and advances each scope's status (pending→running→done); a failing ingest shows the Error state for that scope without blocking the others; reaching all-done shows "Done" / enters the app. Accessible names on checkboxes + buttons (aria-requirements).
- [ ] **Step 2–4** — implement `ScanStep` (list + checkboxes + Add), `IngestStep` (per-scope progress driven by `ingestStatus`), the `OnboardingWizard` container orchestrating steps via `useOnboarding`. Each file < 300 lines. **Step 5 — commit.**

### Task 4.3: First-run gate in the shell

- [ ] **Step 1 — Failing test:** the shell renders `OnboardingWizard` when `isOnboarded` is false and not once it's true (locate the shell entry — likely `src/App.tsx`).
- [ ] **Step 2–4** — mount the wizard behind the gate; persist the onboarded flag (app store / settings) so it shows once. **Step 5 — Gate + commit.**

```bash
bash .claude/hooks/gate.sh
```

**Dev-loop input for Phase 4:** "Implement Phase 4 of docs/superpowers/plans/2026-06-09-onboarding-discovery-understanding.md: src/hooks/useOnboarding.ts (scan/ingest, per-scope status map, isOnboarded gate from profiles:list/flag); ingestStatus.ts (IngestStatus as-const enum + Record presentation map, no chain); OnboardingWizard with ScanStep (candidates list + plugin badges + checkboxes + 'Add selected') and IngestStep (per-scope pending→running→done/error progress, an error doesn't block others); mount it in the app shell behind the isOnboarded first-run gate (persist the flag so it shows once). Stub window.api in tests; accessible names. Strict TDD; CLAUDE.md + src/CLAUDE.md + aria-requirements (no any; enum+behavior-map; 300-line limit; design-system CSS vars; explicit ternaries). Gate green."

---

## Phase 5 — Profile view (renderer)

**Files:** Create `src/components/Onboarding/ProfileView/ProfileView.tsx` (+test). Reuse `_ui/MarkdownBody`.

### Task 5.1: `ProfileView`

- [ ] **Step 1 — Failing test:** given a `ScopeProfile`, renders its `profileMd` via `MarkdownBody` and a "Refresh" control that calls `profiles:refresh` for the scope and shows the refreshed profile; shows an empty/"not generated yet" state when no profile.
- [ ] **Step 2–4** — implement a read-only view + refresh button (stub `window.api` in tests). Reachable per scope; exact placement (a tab vs a panel) is a small wiring choice — default to a read-only view opened per scope, consistent with how the app opens per-scope detail. **Step 5 — Gate + commit.**

```bash
bash .claude/hooks/gate.sh
```

**Dev-loop input for Phase 5:** "Implement Phase 5 of docs/superpowers/plans/2026-06-09-onboarding-discovery-understanding.md: src/components/Onboarding/ProfileView/ProfileView.tsx — read-only render of a ScopeProfile.profileMd via _ui/MarkdownBody + a 'Refresh' button calling profiles:refresh and showing the result; empty state when no profile. Wire it reachable per scope consistently with existing per-scope detail views. Stub window.api in tests. Strict TDD; CLAUDE.md + src/CLAUDE.md (no any; 300-line limit; design-system CSS vars). Gate green."

---

## Self-Review

**Spec coverage:**
- Discover repos with root-level `.claude`, dedup nested, user-scope for root-level → Phase 1. ✓
- Detect other-plugin dirs (`.a5c`), extensible → Phase 1 (`PLUGIN_DIRS` Record). ✓
- Agentic `claude --print` at scope root exploring `.claude` → Phase 2 (`ingestScope`, cwd=scopePath). ✓
- Per-scope narrative profile (shape A) → Phase 2 (`profileMd`). ✓
- Persist in SQLite with staleness hash → Phase 2 (`scope_profiles` + `inputs_hash`). ✓
- Refresh on add + manual → Phase 2 (`refreshProfile`) + Phase 5 (button). ✓
- First-run wizard: scan → suggest → ingest progress → done → enter app → Phase 4. ✓
- Profile display (orientation A) → Phase 5. ✓
- Scan = HOME, depth/skip reused → Phase 1. ✓
- Enum + behavior maps (IngestStatus), no chains → Phase 4.1. ✓
- Out of scope (consumers, structured annotations, deep plugin parsing, auto-refresh-on-change, whole-FS scan) → not planned. ✓

**Placeholder scan:** Backend phases carry concrete signatures/SQL; renderer + IPC phases describe components/handlers behaviorally with exact paths, contracts, and dev-loop inputs (the repo's exact spawn-stub/IPC-test/_ui idioms are read at execution time). No "TBD"/"handle errors" without specifics — the failing-ingest, empty, and not-onboarded states are each called out. All types (`Candidate`, `ScopeProfile`, `IngestStatus`) defined where introduced.

**Type consistency:** `Candidate`, `ScopeProfile`, `scanCandidates`, `ingestScope`/`getProfile`/`listProfiles`/`refreshProfile`, `scope_profiles`/`inputs_hash`, the five IPC channels, `useOnboarding`, `ingestStatus`/`IngestStatus`, `OnboardingWizard`, `ProfileView` are used identically across phases.
