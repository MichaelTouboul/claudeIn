# Self-Improve loop — runner contract

This document specifies how a Claude Code `/loop` watcher (the **runner**)
consumes the Self-Improve **inbox** produced by the app in phase I1. The runner
is now implemented as the **`self-improve-runner` skill**
(`.claude/skills/self-improve-runner/SKILL.md`) — run it under `/loop` with
`--dangerously-skip-permissions`; this document remains the protocol spec it
follows. The app side (types, service, IPC) is implemented in:

- `electron/types/improve.types.ts`
- `electron/services/improve-inbox.service.ts` + `improve-inbox.io.ts`
- `electron/ipc/improve.ipc.ts`

## File-as-source-of-truth

The inbox is a plain directory:

```
~/.claude-agent-manager/improve-inbox/
  <uuid>.json
  <uuid>.json
  ...
```

There is **one JSON file per request**, named `<id>.json` (`id` is a v4 UUID
minted by the app). **The file on disk is the single source of truth** — there
is no database, no lock, no queue server. Both sides (app and runner) read and
write these files directly:

- The **app** writes a new file with `status: "pending"` when the user submits
  a request, and re-reads files to render the inbox. Its `fs.watch` re-reads
  any changed file and pushes `improve_request_changed` to the renderer, so a
  status the runner writes shows up live in the UI.
- The **runner** reads pending files, does the work, then writes a terminal
  status back into the **same file** (merge, don't replace unknown fields).

Because the file is authoritative, the runner does not need to coordinate with
the app process; it only needs filesystem access to the inbox dir.

## Request JSON schema

```jsonc
{
  "id": "string",            // v4 UUID, == filename stem; app-minted, never changed
  "createdAt": "string",     // ISO-8601 timestamp, app-minted
  "type": "feature",         // "feature" | "bug" | "design" | "performance" | "copy"
  "component": "string?",    // optional: UI component / area hint
  "sourcePath": "string?",   // optional: file/dir the request originates from
  "title": "string",         // short imperative summary (used as the prompt headline)
  "description": "string",   // full description of the desired change
  "acceptance": ["string"],  // acceptance criteria; each becomes a TDD target
  "transcript": [            // originating conversation turns (may be empty)
    { "role": "string", "text": "string" }
  ],
  "status": "pending",       // "pending" | "in_progress" | "merged" | "failed"
  "claimedAt": "string?",    // set by runner when it claims the request (in_progress)
  "commit": "string?",       // set by runner on success: merged commit sha
  "summary": "string?",      // set by runner on success: what shipped
  "version": "string?",      // set by runner on success: app version after the bump (semver)
  "failureReason": "string?" // set by runner on failure: why it could not ship
}
```

Field ownership:

- **App-owned, immutable to the runner:** `id`, `createdAt`, `type`,
  `component`, `sourcePath`, `title`, `description`, `acceptance`, `transcript`.
- **Runner-owned:** `status`, `claimedAt` (claim write), `commit`, `summary`,
  `version` (the post-bump app version, written with a `merged` terminal write),
  `failureReason` (terminal write).

The runner MUST preserve all app-owned fields verbatim when it writes back —
i.e. read the file, shallow-merge its status patch, write the whole object.
(The app's `updateStatus(id, patch)` does exactly this merge; a runner writing
JSON directly must replicate it.)

## Concurrency model — claim, dispatch, serialized merge

The runner is the seed of a **queue**: it runs dev work for several requests
**concurrently** but integrates results **one at a time**. Three rules make this
safe with the file-as-source-of-truth model (no DB, no lock server):

1. **Claim first (the lock substitute).** Before doing any work, the watcher
   atomically claims a `pending` request by writing
   `{ status: "in_progress", claimedAt: <now ISO-8601> }` into its file. The
   file itself is the lock: a second watcher (or a re-entrant poll tick) that
   re-reads the dir skips anything not `pending`, so a claimed request is never
   picked up twice. `claimedAt` is the claim timestamp, used for crash-recovery
   (below).
2. **Dispatch in the background.** After claiming, the watcher DISPATCHES the
   dev work as a **background worktree agent** and **returns immediately** to
   polling. It does not block on the dev-loop. This is what lets multiple
   requests be in flight (`in_progress`) at once — each in its own worktree on
   its own branch.
3. **Serialize the merge.** The integrate step — merge the branch into `main`,
   re-run the quality gate on the merge result, then push — MUST be
   **serialized: at most one merge runs at a time**, guarded by a single
   in-process merge mutex / merge queue. Concurrent worktrees can be *built and
   gated* in parallel, but merging two of them into `main` simultaneously races
   on the same working tree and history and produces conflicts or a broken
   `main`. So feature-dev + gate fan out; merge + push funnel back through one
   lane. A request only becomes `merged` after it has passed the gate *on the
   post-merge state*.

```
watcher (returns to polling after each claim):
  for each <id>.json where status == "pending":
    claim it:  write { ...request, status: "in_progress", claimedAt: now() }
    DISPATCH (background worktree agent), then continue the loop immediately:
      1. create an isolated git worktree on a fresh branch
      2. feature-dev (strict TDD): turn `acceptance[]` into failing tests, then
         implement; `title` + `description` are the spec, `sourcePath` /
         `component` scope where to look
      3. run the quality gate (bash .claude/hooks/gate.sh) until green   ← parallel
      4. enter the SERIALIZED merge lane (one at a time) — call the universal       ← funnel
         landing script, which owns bump+merge+gate+push (see "Versioning" below):
           version = .claude/hooks/land.sh <branch> <level>   # level = feature?minor:patch
    on success:
      write back { ...request, status: "merged", commit: <sha>, summary: <text>, version: <new> }
    on failure (ambiguous spec, gate can't go green, merge conflict, ...):
      write back { ...request, status: "failed", failureReason: <text> }
  wait for the next change (watch the dir) or poll on an interval, then repeat
```

### Versioning

Every merged improvement bumps the app's **semver** version (`package.json`
`"version"`), and the resulting version is written back into the request file so
the app can show the user exactly which release shipped their request.

**The watcher does NOT version by hand.** Versioning is universal — *every* landing
on `main`, from any source (this watcher, the autonomous dev-loop, a manual merge),
goes through one script: **`.claude/hooks/land.sh <branch> [patch|minor]`**. It owns
the whole `bump → merge --no-ff → gate → push` sequence and prints the new version as
its last stdout line. A `pre-push` git hook rejects any push to `main` that does not
bump the version, so the invariant holds regardless of who lands the work. See
`docs/superpowers/specs/2026-06-15-universal-versioning-design.md`.

- **Baseline:** `0.1.0`. Pre-1.0, everything stays in the `0.x` range.
- **Bump level — by request `type`** (the watcher maps type → level, then passes it):
  - `feature` → **minor** bump (`0.X.0`): `land.sh <branch> minor`.
  - `bug` / `performance` / `design` / `copy` → **patch** bump (`0.0.X`):
    `land.sh <branch> patch`.
  - These explicit levels are now **overrides**. As of the 2026-06-16 amendment,
    `land.sh`'s default is `auto` — the level is derived from the branch's commits
    (Conventional Commits; chore/docs-only → **none**, no bump). See the design doc's
    amendment. The watcher may keep passing explicit levels or switch to `auto`.

- **Where it happens — inside the SERIALIZED merge lane.** `land.sh` is the single
  merge path, so it *is* the serialization point: the bump runs as part of finalizing
  the merge, with the bumped `package.json` folded into the merge commit. Because at
  most one `land.sh` runs at a time (see rule 3 above), versions **never race**: two
  concurrently-built worktrees can be gated in parallel, but they are versioned one
  after another as each enters the lane, so the sequence of versions is strictly
  monotonic and there are no duplicate or skipped versions.

- **Recording it.** On success the runner writes the bumped version into the
  request file alongside the rest of the terminal write:
  `updateStatus(id, { status: "merged", commit, summary, version })` (or the
  equivalent direct read-merge-write). `version` is **runner-owned**; the app
  never sets it. Older merged requests written before versioning existed simply
  omit `version`, and the UI falls back to showing a plain "Update".

### Picking up work

The runner discovers work either by **polling** the dir on an interval
(`readdir` → filter `status === "pending"`) or by **watching** it (`fs.watch`),
exactly mirroring the app's own watcher. Either way, the file's `status` field —
not an in-memory queue — decides whether a request is still open: only `pending`
files are claimed, and claiming flips them to `in_progress` so they are not
re-picked.

### Crash recovery — stale `in_progress` → `pending`

`in_progress` is a *soft* lock held only by a live background agent. If the
runner crashes (or is killed) mid-flight, requests are left stuck in
`in_progress` with no agent driving them. On startup, and on each poll tick, the
runner therefore **reclaims stale claims**:

> An `in_progress` request whose `claimedAt` is older than a threshold
> (e.g. **30 minutes**) and has **no live agent** for it is considered **stale**
> and is reset to `pending` (clearing nothing else), so the next claim re-picks
> it.

Reasoning: the file is the only durable state, so a dead agent cannot release
its own claim — a peer (the restarted runner) must time it out. The threshold
must comfortably exceed a normal dev-loop run so a slow-but-live job is never
reclaimed underneath itself; pairing the age check with a liveness check (is an
agent actually running for this id?) avoids reclaiming a job that is simply
taking a long time. A still-`pending` request is never lost: a fresh runner just
re-reads it on restart.

### Writing the result

The runner finalizes a request by writing the terminal status into its file.
Two equivalent options:

- Call the app service `updateStatus(id, patch)` (it reads, merges, persists),
  for example:
  - success: `updateStatus(id, { status: "merged", commit, summary, version })`
  - failure: `updateStatus(id, { status: "failed", failureReason })`
- Or write the JSON file directly (read → shallow-merge the patch → write the
  whole object back to `<id>.json`). The app's `fs.watch` re-reads the file and
  broadcasts `improve_request_changed`, so the UI updates with no extra signal.

A request is **terminal** once `status` is `merged` or `failed`; the runner
never re-opens it. If a `failed` request should be retried, the user re-submits
(producing a new `pending` file with a new `id`) rather than mutating the old
one.

## Invariants

- One file per request; filename stem == `id`.
- `status` transitions: `pending → in_progress → (merged | failed)`. The only
  backward transition is the crash-recovery reset `in_progress → pending` for a
  stale claim. `merged` and `failed` are terminal — the runner never re-opens
  them. (To retry a `failed` request the user re-submits, producing a new
  `pending` file with a new `id`, rather than mutating the old one.)
- Only `pending` files are claimed; a claim writes `in_progress` + `claimedAt`.
- Dev work runs concurrently in background worktrees; **merge/integrate is
  serialized to at most one at a time**.
- The runner never edits app-owned fields.
- No partial/streaming writes are relied upon: a reader that hits a half-written
  or invalid file simply skips it and re-reads on the next event (the app's IO
  helpers already treat parse failure as "skip", never throw).
