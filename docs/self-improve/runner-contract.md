# Self-Improve loop — runner contract

This document specifies how a Claude Code `/loop` watcher (the **runner**)
consumes the Self-Improve **inbox** produced by the app in phase I1. It is
**documentation only** — the watcher itself is not built here. The app side
(types, service, IPC) is implemented in:

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
  "status": "pending",       // "pending" | "merged" | "failed"
  "commit": "string?",       // set by runner on success: merged commit sha
  "summary": "string?",      // set by runner on success: what shipped
  "failureReason": "string?" // set by runner on failure: why it could not ship
}
```

Field ownership:

- **App-owned, immutable to the runner:** `id`, `createdAt`, `type`,
  `component`, `sourcePath`, `title`, `description`, `acceptance`, `transcript`.
- **Runner-owned (terminal write):** `status`, `commit`, `summary`,
  `failureReason`.

The runner MUST preserve all app-owned fields verbatim when it writes back —
i.e. read the file, shallow-merge its status patch, write the whole object.
(The app's `updateStatus(id, patch)` does exactly this merge; a runner writing
JSON directly must replicate it.)

## Runner loop

```
loop:
  for each <id>.json in ~/.claude-agent-manager/improve-inbox/ where status == "pending":
    request = parse(file)
    run the existing dev-loop using the request as the prompt:
      1. create an isolated git worktree on a fresh branch
      2. feature-dev (strict TDD): turn `acceptance[]` into failing tests, then
         implement; `title` + `description` are the spec, `sourcePath` /
         `component` scope where to look
      3. run the quality gate (bash .claude/hooks/gate.sh) until green
      4. on green: merge to main, push
    on success:
      write back { ...request, status: "merged", commit: <sha>, summary: <text> }
    on failure (ambiguous spec, gate can't go green, merge conflict, ...):
      write back { ...request, status: "failed", failureReason: <text> }
  wait for the next change (watch the dir) or poll on an interval, then repeat
```

### Picking up work

The runner discovers work either by **polling** the dir on an interval
(`readdir` → filter `status === "pending"`) or by **watching** it (`fs.watch`),
exactly mirroring the app's own watcher. Either way, the file's `status` field —
not an in-memory queue — decides whether a request is still open. A crashed
runner simply re-reads `pending` files on restart; nothing is lost.

### Writing the result

The runner finalizes a request by writing the terminal status into its file.
Two equivalent options:

- Call the app service `updateStatus(id, patch)` (it reads, merges, persists),
  for example:
  - success: `updateStatus(id, { status: "merged", commit, summary })`
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
- `status` transitions are one-way: `pending → merged` or `pending → failed`.
- The runner never edits app-owned fields.
- No partial/streaming writes are relied upon: a reader that hits a half-written
  or invalid file simply skips it and re-reads on the next event (the app's IO
  helpers already treat parse failure as "skip", never throw).
