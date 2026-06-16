# Universal Versioning — Design

**Date:** 2026-06-15
**Status:** Approved (brainstorming)

## Goal

Make **every landing on `main` produce a semver bump in `package.json`, regardless of
who lands it** — the Self-Improve watcher, the autonomous dev-loop, or a manual merge.

Today versioning lives only inside the watcher's serialized merge lane (an inline
`npm version` call, per `docs/self-improve/runner-contract.md`). Any other path onto
`main` — my dev-loop integrate step, a manual `git merge`, a direct commit — skips the
bump. The version then no longer tracks what actually shipped. This design moves
versioning off the watcher and onto the one thing every change shares: **the act of
landing on `main`.**

## Decisions (brainstorming)

1. **Granularity = per landing on `main`**, not per commit and not git-derived. A
   feature-dev worktree makes many TDD commits → exactly **one** bump when it merges.
   This matches what the watcher already does; we generalize it to all landing paths.
2. **Enforcement = single script + guardrail hook.** A convention (one `land` script)
   makes the right thing easy; a `pre-push` hook makes the wrong thing impossible to
   forget.
3. **Bump rule = patch by default, explicit `minor` flag.** No branch-name or
   commit-message inference (fragile — agents commit on `worktree-agent-<id>`). The
   caller states the level; default is `patch`.

## Architecture

### 1. The chokepoint — `.claude/hooks/land.sh`

```
land.sh <branch> [patch|minor]      # level defaults to patch
```

The single way to land work on `main`. Steps, in order:

1. **cwd-independent + branch assertion.** Resolve `ROOT` (the main checkout, not a
   worktree) and run **all** git via `git -C "$ROOT"`. Assert
   `git -C "$ROOT" rev-parse --abbrev-ref HEAD == main` and abort otherwise. This
   directly kills the recurring cwd/HEAD-drift no-op-merge bug (see
   `[[project-dev-loop-infra]]`).
2. **Stay current.** `git -C "$ROOT" fetch origin` then
   `git -C "$ROOT" merge --ff-only origin/main` (the live watcher also pushes to
   `main`; we must not diverge).
3. **Bump.** `npm version <level> --no-git-tag-version` (run with cwd `ROOT`) edits
   `package.json` (+ lockfile) in place, no tag, no commit — so the bump folds into the
   landing merge commit.
4. **Merge.** `git -C "$ROOT" merge --no-ff <branch>` — the merge commit includes the
   bumped `package.json`.
5. **Gate on the result.** `( cd "$ROOT" && CLAUDE_GATE=1 bash .claude/hooks/gate.sh )`.
   If it fails → `git -C "$ROOT" reset --hard origin/main` (undo the bump + merge) and
   exit non-zero. Never leave a red `main`.
6. **Push.** `git -C "$ROOT" push origin main` with a behind-origin guard (re-fetch and
   re-`ff-only` if rejected, then re-push; if still rejected, abort and report).
7. **Emit the version.** Print the new version (e.g. `0.2.0`) as the **last line of
   stdout** so any caller can capture it.

`land.sh` owns the whole bump→merge→gate→push sequence. Nobody else runs `npm version`
or merges to `main` directly.

### 2. The guardrail — `pre-push` git hook

- **Install mechanism:** a tracked hooks dir `.claude/githooks/` wired via
  `git config core.hooksPath .claude/githooks`. Tracked-in-repo so it applies in every
  worktree; a tiny `npm run hooks:install` (or a line in `postinstall`) sets
  `core.hooksPath` on a fresh clone.
- **Behavior:** on `git push`, for the `main` ref only, compare the pushed `HEAD`'s
  `package.json` `version` against `origin/main`'s. **If they are equal, reject the
  push** with a one-line reason (`main push rejected: version not bumped — land via
  .claude/hooks/land.sh`). Non-`main` refs (worktree branches) push freely.
- **Why version-diff, not author check:** the hook enforces the *outcome* ("main
  advanced without a version bump") independent of who produced the commit — the literal
  meaning of "peu importe d'où vient le commit." `--no-verify` remains an explicit,
  visible emergency override.

### 3. Watcher integration (runner-contract update)

The serialized merge lane in `docs/self-improve/runner-contract.md` changes from
"inline `npm version` + manual merge + push" to:

```
level = (request.type === 'feature') ? 'minor' : 'patch'
version = land.sh <branch> <level>        # capture last stdout line
updateStatus(id, { status:'merged', commit, summary, version })
```

The request schema and field ownership are unchanged — `version` stays runner-owned;
`land.sh` simply becomes the mechanism that produces it. The merge-serialization
invariant still holds: `land.sh` is the only merge path, so concurrent worktrees still
gate in parallel but version one-at-a-time as each enters the lane → strictly monotonic
versions, no races.

## Data flow

```
worktree branch (gate-green)
        │
        ▼
   land.sh <branch> [level]
        │  fetch + ff-only origin/main
        │  npm version <level> --no-git-tag-version   ← the bump
        │  merge --no-ff <branch>                      (bump folded in)
        │  gate.sh  ──red──▶ reset --hard origin/main, exit≠0
        │   │green
        │  push origin main ──▶ pre-push hook checks version diff ──▶ accept
        ▼
   stdout: "<new-version>"
        │
        ▼
  caller records it (watcher → request file; dev-loop/manual → just informational)
```

## Edge cases

- **Two landings race** (watcher + dev-loop): each calls `land.sh`; the
  fetch/ff-only + push-with-guard sequence serializes them. The second re-bases on the
  first's bump, so versions never collide. (Operationally we still avoid two *concurrent*
  `land.sh` invocations; the guard is the backstop.)
- **Gate red after merge:** `reset --hard origin/main` removes both the merge and the
  bump — `main` and `package.json` return to the pre-landing state. No half-versioned
  state.
- **Direct commit on `main`** (no branch to merge): still must bump. Either land it
  through `land.sh` with a trivial fast-forward, or the pre-push hook rejects the push.
  We do not add a separate path — the hook keeps the invariant.
- **Pre-existing un-bumped local `main`:** the hook only compares at push time, so a
  local-only experiment is fine; it just cannot reach `origin/main` without a bump.

## Scope

- **IN:** `.claude/hooks/land.sh`; `.claude/githooks/pre-push` + install wiring;
  runner-contract update to call `land.sh`; a short note in root `CLAUDE.md` /
  `electron/CLAUDE.md` documenting "land via `land.sh`".
- **OUT:** changing the bump granularity later to git-derived; CI-side enforcement
  (local hook only for now); tagging/releases/changelog generation; the `1.0.0`
  promotion policy (stays `0.x` patch/minor pre-v0).

## Verification

This is infra/tooling (shell + git hooks), not app TypeScript — it sits **outside** the
worktree/gate dev-loop. Build directly and verify by dry-run on a throwaway branch:

1. Create a no-op branch, `land.sh throwaway patch` → assert `package.json` bumped by one
   patch, merge commit present, gate green, version printed.
2. Manually advance `main` by a commit **without** bumping, attempt `git push` → assert
   the `pre-push` hook **rejects** it; then `land.sh`-style bump → push accepted.
3. `land.sh throwaway minor` → assert minor bump.
4. Confirm `land.sh` aborts when `HEAD != main` and when cwd is inside a worktree.

## Amendment (2026-06-16) — Conventional-Commits-derived levels; `chore` → no bump

Decision 3 above (patch-by-default, manual level) is **superseded**. Rationale: SemVer
and Conventional Commits both say a non-releasing change (a skill, docs, CI config) should
produce **no** version bump. Forcing a patch on every chore made the version a landing
*counter* rather than a release marker. The original "no commit-message inference" worry
is resolved by deriving over the *branch's whole commit set* (not the throwaway branch
*name*), which is stable regardless of `worktree-agent-<id>` naming.

**New rule — the level is a function of the commits, not a manual arg:**

- One shared derivation, `.claude/hooks/bump-level.sh <root> <range>` → `major|minor|patch|none`:
  - breaking (`type!:` or a `BREAKING CHANGE:` footer) → **major**
  - `feat` → **minor**; `fix`/`perf`/`revert` → **patch**
  - `chore`/`docs`/`style`/`refactor`/`test`/`ci`/`build` → **none**
  - anything non-Conventional → **patch** (safety: a forgotten bump is never read as a chore)
  - merge commits ignored (`--no-merges`); highest level across the range wins.
- `land.sh <branch>` defaults to `auto` (derive); `none|patch|minor|major` override.
  When the level is `none`, the merge lands with **no** `npm version` call.
- The `pre-push` guardrail **re-derives with the same helper**: a no-bump push to `main`
  is rejected *unless* every new commit is non-releasing (`none`). So the invariant is no
  longer "main always bumps" but "**main never advances with a bump it owes un-paid**".

**Tests** (live in `.claude/hooks/__tests__/`, run with `bash`): `bump-level.test.sh`
(12 cases over a throwaway repo) and `pre-push.test.sh` (6-case end-to-end accept/reject
against a bare remote wired with the real hooks).
