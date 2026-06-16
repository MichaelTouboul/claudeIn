---
name: self-improve-runner
description: Use when running the ClaudeIn Self-Improve loop — the watcher that drains the improve-inbox of "Improve this" feature/bug requests filed from the app. Claims every pending request, dispatches each through a worktree feature-dev worker in parallel, lands finished branches via land.sh (serialized), and writes status back to the file. Built to run under `/loop` with --dangerously-skip-permissions. Trigger on "self-improve runner", "process improve requests", "drain improve inbox", "run the self-improve loop", "/loop /self-improve-runner".
---

# Self-Improve runner

The consumer side of the app's "Improve this" feature. The app writes each request as
one `<id>.json` into the inbox with `status: "pending"`; **this skill is the runner that
processes them.** It implements `docs/self-improve/runner-contract.md` — read that for the
full rationale. Mode (decided with the user): **fully non-stop, parallel** — no pause
thresholds, many workers in flight at once, merges serialized through `land.sh`.

Designed to be looped:

```
claude --dangerously-skip-permissions
> /loop /self-improve-runner
```

## Inbox — the file is the source of truth

`~/.claude-agent-manager/improve-inbox/<id>.json`, one request per file. The `status`
field — not memory — decides what is open:

- `pending` → not yet claimed (claim it)
- `in_progress` → a worker is (or was) building it; `claimedAt` is the soft-lock timestamp
- `merged` / `failed` → **terminal**, never re-open

Fields are split by owner. **App-owned, NEVER modify:** `id`, `createdAt`, `type`
(`feature|bug|design|performance|copy`), `component?`, `sourcePath?`, `title`,
`description`, `acceptance[]`, `transcript[]`. **Runner-owned, the only ones you write:**
`status`, `claimedAt`, `commit`, `summary`, `version`, `failureReason`, `attempts`
(retry counter, see below). Always **read → shallow-merge your patch → write the whole
object back** (preserve app-owned fields verbatim). The app's `fs.watch` re-reads the file
and updates the UI; unknown fields like `attempts` are kept untouched by the app.

Generic read-merge-write helper (use for claim AND write-back):

```bash
INBOX="$HOME/.claude-agent-manager/improve-inbox"
patch() { # patch <file> <json-patch>
  node -e 'const fs=require("fs"),f=process.argv[1],p=JSON.parse(process.argv[2]);
    const r=JSON.parse(fs.readFileSync(f));Object.assign(r,p);
    fs.writeFileSync(f,JSON.stringify(r,null,2)+"\n")' "$1" "$2"
}
```

## One tick (what `/loop` re-runs)

### 0. Reclaim stale claims (crash recovery)
List `$INBOX/*.json`. Any `in_progress` whose `claimedAt` is **> 30 min** old AND has
**no live worker agent** for its id → reset to `pending` (`patch <file> '{"status":"pending"}'`).
A dead worker cannot release its own lock; the restarted runner times it out. Never reclaim
a job that still has a live agent (it may just be slow).

### 1. Claim every pending — in parallel, with a retry cap
For each file with `status == "pending"`, first **check the retry cap** so a request that
keeps stalling can never loop forever. `MAX_ATTEMPTS = 3`. Read its current `attempts`
(absent → 0) and increment:

```bash
MAX_ATTEMPTS=3
n=$(node -e 'process.stdout.write(String((JSON.parse(require("fs").readFileSync(process.argv[1])).attempts||0)+1))' "$f")
if [ "$n" -gt "$MAX_ATTEMPTS" ]; then
  patch "$f" '{"status":"failed","failureReason":"exceeded max attempts ('"$MAX_ATTEMPTS"') — kept stalling/blocking, gave up"}'
  continue   # do NOT dispatch — terminal
fi
patch "$f" "{\"status\":\"in_progress\",\"claimedAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"attempts\":$n}"
```

Claiming flips it to `in_progress` so no peer/tick re-picks it. Record the `id`. Because
`attempts` increments on **every** claim (including stale-reclaim re-picks from step 0), a
request that repeatedly hangs is force-`failed` after `MAX_ATTEMPTS` cycles instead of
re-dispatching endlessly.

### 2. Dispatch one worker per claimed request — background worktrees, parallel
For each freshly-claimed request, dispatch the **`feature-dev`** agent with the Agent tool:
`subagent_type: "feature-dev"`, `isolation: "worktree"`, `run_in_background: true`. The
prompt is the request as a spec — pass `title` (headline), `description`, every
`acceptance[]` item (each becomes a TDD target), and `sourcePath`/`component` as the scope
hint. feature-dev does strict TDD, self-verifies with the gate, and **commits to its
branch — it must NOT land/push** (the runner lands). Remember each `id → branch`. Then
return to polling immediately; do not block on workers.

### 3. Land finished workers — SERIALIZED (one `land.sh` at a time)
You are auto-re-invoked when a background worker completes. For each finished branch,
**one at a time** (never two `land.sh` concurrently — it is the version-serialization
point):

```bash
# level from the request type — feature→minor, everything else→patch
level=$( [ "$type" = "feature" ] && echo minor || echo patch )
version=$( .claude/hooks/land.sh "$branch" "$level" | tail -1 )   # last stdout line = new version
```

- **Success** (land prints a version, exit 0): write the terminal status, then remove the worktree.
  ```bash
  patch "$INBOX/$id.json" "{\"status\":\"merged\",\"commit\":\"$(git rev-parse HEAD)\",\"summary\":\"<one line: what shipped>\",\"version\":\"$version\"}"
  git worktree remove ".claude/worktrees/<wt>" --force; git branch -D "$branch"
  ```
- **Failure** (gate red, merge conflict, ambiguous spec the worker couldn't satisfy, exit ≠ 0):
  ```bash
  patch "$INBOX/$id.json" '{"status":"failed","failureReason":"<short why it could not ship>"}'
  ```
  `land.sh` already rolls `main` back on a red gate, so nothing partial lands. Then clean up the worktree/branch.

## Two ways you wake (dual trigger)
- **`/loop`** re-runs a tick → picks up **newly submitted** `pending` files.
- **Background worker completion** auto-re-invokes you → do step 3 (land + write status).

Between ticks with nothing pending and no workers in flight, the tick is a clean no-op;
`/loop` re-invokes to keep watching. This is the intended non-stop idle state.

## Reporting (terse — swarm convention)
Report to the user **only when a request reaches a terminal state** (one line:
`merged vX.Y.Z` or `failed: reason`). Do claiming, dispatching, stale-reclaim, and worktree
cleanup **silently**. Don't narrate idle ticks.

## Invariants (do not violate)
- Touch **only** runner-owned fields; preserve every app-owned field verbatim.
- **Serialize `land.sh`** — at most one merge at a time; versions must never race.
- Never run `land.sh` from inside a worktree — it asserts `HEAD == main` in the main
  worktree and merges the branch in. Workers build in worktrees; the runner lands from main.
- `merged`/`failed` is terminal — never re-open. A retry is the user re-submitting (new `id`).
- **Bounded retries:** a request is claimed at most `MAX_ATTEMPTS` (3) times across all
  stall/reclaim cycles, then force-`failed`. A request can never wedge the loop. (Caveat:
  the cap bounds *re-dispatches*, not a single worker that hangs while still "live" — the
  30-min stale timeout reclaims that one, which then counts as an attempt.)
