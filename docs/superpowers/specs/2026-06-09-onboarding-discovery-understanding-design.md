# Onboarding — Setup Discovery & LLM Understanding — Design

**Date:** 2026-06-09
**Status:** Approved (brainstorm) → ready for implementation plan
**Scope:** Backend (scan + agentic ingestion + SQLite persistence + IPC) and renderer (first-run wizard).

## What this is

A **first-run onboarding** that bootstraps ClaudeIn's understanding of the user's Claude Code setup:

1. **Discovers candidate repos** — directories with `.claude` **at their own root** (a repo's nested children with their own `.claude` are NOT separate candidates). A `.claude` at the filesystem root maps to **user scope** (today's behavior). Detects, in parallel, other-plugin data dirs (babysitter's `.a5c`, extensible).
2. **Builds a persistent per-scope "understanding"** by running an **agentic `claude --print`** at each selected scope's root that **explores its `.claude` itself** and emits a narrative markdown **profile**, which the app persists.

The `.claude` directory is treated as the **main source of truth**, and an LLM — not rigid parsing — reads it, because the LLM can follow the structure, the cross-references, and the prose intent that static parsing misses. The persisted profile is the seed for **pillar 5** (automatic context optimization): future features (context curation, smart suggestions) will consume it. **Those consumers are out of scope here** — this feature produces and persists the understanding (and shows it), nothing reads it yet.

## Why now

The app already scans for `.claude` projects (`scanForProjects` in `electron/services/project.service.ts`, from `HOME`, depth `SCAN_DEPTH=3`, with `PROJECT_SKIP_DIRS`) and mirrors agents/skills/MCP/memory structurally. What's missing is (a) an explicit onboarding that lets the user choose which repos to track, and (b) an LLM-derived *understanding* of each setup beyond raw frontmatter. There is no first-run flow today.

## Key decisions (locked in brainstorm)

- **Understanding shape = per-scope narrative profile** (markdown), one per scope. NOT structured per-entity annotations — that's deferred to a future spec when a consumer needs granular selection.
- **Ingestion is agentic**: spawn `claude --print` with `cwd` = the scope root and a prompt to **explore `.claude` on its own** (+ note detected plugin dirs) and produce the profile. Reuses `spawn.service.ts` (subscription auth via `--print`, consistent with the app's existing LLM path — no Agent-SDK/API-key migration).
- **Scan root = `HOME`** (depth 3, existing skip-list), not the whole filesystem `/` — performance.
- **Candidate = `.claude` at a repo's own root**, dedup so nested `.claude` under an already-found candidate is not a separate candidate.
- **Flow = explicit first-run wizard**: scan → suggest (checkboxes) → add selected → ingest (progress) → land in app with profiles ready.
- **Other-plugin data (v1) = detect + mention**: discovery flags `.a5c` (extensible list of known plugin dirs); the ingestion prompt is told about detected plugin dirs so the narrative mentions them. No deep parsing of babysitter internals.
- **Refresh = on add + manual "refresh profile"**. Auto-refresh on `.claude` change is v1.1 (watchers already exist).

## Architecture

### Backend — `electron/`

**`electron/services/onboarding.service.ts` (create)** — discovery.
- `scanCandidates(): Promise<Candidate[]>` — walk from `HOME` (reuse `PROJECT_SCAN_DEPTH` + `PROJECT_SKIP_DIRS` from `project.service.ts`; do NOT re-derive). A directory is a `Candidate` when it contains `.claude` at its own root. Dedup: once a candidate is recorded, do not descend into it looking for nested `.claude` candidates. `HOME` itself / a root-level `.claude` → represented as the **user** scope (mirror the existing `projectPath === HOME` special-case).
- For each candidate, detect known plugin dirs (start with `.a5c`) → `plugins: string[]`.

```ts
type Candidate = {
  path: string;          // repo root (or the user-scope sentinel)
  scope: 'user' | 'project';
  hasClaude: true;
  plugins: string[];     // e.g. ['babysitter'] when .a5c present
};
```

**`electron/services/profile.service.ts` (create)** — agentic ingestion + persistence.
- `ingestScope(scopePath, scope, plugins): Promise<ScopeProfile>` — spawn `claude --print` (via `spawn.service.ts`) with `cwd = scopePath` and an exploration prompt: "Explore the `.claude` directory at this root (agents, skills, MCP servers, hooks, memory/CLAUDE.md). The following other-plugin data dirs were detected: <plugins>. Produce a concise narrative profile of this setup — what's configured, what each major piece is for, and how they fit together." Capture stdout = the markdown profile.
- Persist to SQLite (`db.ts`) — new table `scope_profiles`:

```sql
CREATE TABLE IF NOT EXISTS scope_profiles (
  scope_path  TEXT PRIMARY KEY,
  scope       TEXT NOT NULL,          -- 'user' | 'project'
  profile_md  TEXT NOT NULL,
  inputs_hash TEXT NOT NULL,          -- hash of the .claude inputs → staleness check
  generated_at TEXT NOT NULL
);
```

- `inputs_hash` = a cheap hash of the `.claude` tree (file paths + mtimes, or sizes) so a later "is this stale?" check is possible without re-reading content.
- `getProfile(scopePath)`, `listProfiles()`, `refreshProfile(scopePath)` (re-run `ingestScope`, overwrite row).

```ts
type ScopeProfile = {
  scopePath: string;
  scope: 'user' | 'project';
  profileMd: string;
  generatedAt: string;
};
```

**IPC — `electron/ipc/onboarding.ipc.ts` (create)**, registered in `ipc/index.ts`:
- `onboarding:scan` → `Candidate[]`
- `onboarding:ingest` (scopePath, scope, plugins) → `ScopeProfile` (one scope; the wizard calls it per selected scope to drive progress)
- `profiles:list` → `ScopeProfile[]`
- `profiles:get` (scopePath) → `ScopeProfile | null`
- `profiles:refresh` (scopePath) → `ScopeProfile`

Add the matching `window.api` methods to `electron/preload.ts` and declare them in `src/env.d.ts`. Types shared via `electron/types/onboarding.types.ts` (+ a renderer mirror in `src/types/`).

### Renderer — `src/`

- **`OnboardingWizard`** — the first-run flow: a **Scan** step (spinner → candidate list with path + plugin badges + checkboxes + "Add selected"), then an **Ingest** step (per-scope progress: pending → running → done/error), then **Done** (enter the app). Drives via the IPC above.
- **First-run trigger**: show the wizard when no scopes have been onboarded yet (e.g. `profiles:list` is empty / a persisted `onboardingCompleted` flag is unset). A persisted flag (in the existing app store / SQLite settings) gates it so it shows once; expose a manual "re-run discovery" entry later (out of scope to design here beyond leaving the wizard re-openable).
- **Profile display** (bonus orientation, "A"): a simple read-only view rendering a scope's `profileMd` (reuse the existing `MarkdownBody` `_ui` primitive) with a "Refresh" button calling `profiles:refresh`. Where it lives in the shell (a tab vs a panel) is a small placement decision for the plan; default to a read-only view reachable per scope.

## State modeling (CLAUDE.md compliance)

- Scope is the `'user' | 'project'` inline union (mirrors existing usage). Wizard step + per-scope ingest status are finite states modeled as `as const` enums with `Record` behavior maps (e.g. `IngestStatus = { Pending, Running, Done, Error }` → presentation), not fallback chains; `?? Error`/`?? Pending` only for the genuinely-absent case.
- No `any`; named imports; `import type`; `@/` alias; 300-line hard limit (split scan vs ingest vs persistence; split wizard steps into sub-components); design-system CSS vars; explicit ternaries.

## Testing

- **`onboarding.service`** — `scanCandidates` finds a dir with root-level `.claude`; does NOT add a nested `.claude` under an already-found candidate; maps a root-level/`HOME` `.claude` to user scope; detects `.a5c` → `plugins: ['babysitter']`; respects the skip-list. Use a temp dir tree fixture (the repo's backend tests already build fs fixtures).
- **`profile.service`** — `ingestScope` calls the spawn path with `cwd = scopePath` and persists a row; `getProfile`/`listProfiles` round-trip; `refreshProfile` overwrites and updates `generatedAt`; `inputs_hash` changes when the `.claude` tree changes. Stub the spawn so the LLM is not actually invoked in tests (assert the command/cwd/prompt and feed a canned stdout) — no network, deterministic.
- **IPC** — handlers wire to the services and return the contract shapes.
- **`OnboardingWizard`** — renders candidates from a stubbed `onboarding:scan`; selecting + "Add" calls `onboarding:ingest` per selected scope and advances per-scope status; an ingest error shows the error state without blocking the others; "Done" enters the app.
- **First-run gate** — wizard shows when not onboarded, hidden once the flag is set.

Backend tests run NODE_ENV=test; gate is `bash .claude/hooks/gate.sh`.

## Out of scope (future)

- **Consumers** of the profile: context curation, smart suggestions, memory pruning (pillar 5) — separate features.
- **Structured per-entity annotations** (understanding shape B/C) — when a consumer needs granular selection.
- **Deep parsing of other-plugin internals** (babysitter run data, etc.) — v1 only detects + mentions.
- **Auto-refresh on `.claude` change** — v1.1 (reuse existing mirror watchers, debounced).
- **Whole-filesystem scan** — scan is `HOME`-rooted.

## Suggested build sequence

1. **Discovery** — `onboarding.service.scanCandidates` (+ plugin detection), reusing `project.service` scan constants. (TDD, backend)
2. **Persistence + ingestion** — `scope_profiles` table in `db.ts`; `profile.service` (`ingestScope` via stubbed spawn in tests, `getProfile`/`listProfiles`/`refreshProfile`). (TDD, backend)
3. **IPC + contract** — `onboarding.ipc.ts`, `preload.ts`, `env.d.ts`, shared types. (TDD where the repo tests IPC)
4. **Wizard UI** — `OnboardingWizard` (scan → suggest → ingest progress → done) + first-run gate. (TDD, renderer)
5. **Profile view** — read-only markdown view + refresh. (TDD, renderer)

Each step is gate-verified and committed independently.
