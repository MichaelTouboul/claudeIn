#!/usr/bin/env bash
# Universal versioning — the SINGLE way to land work on main.
#
#   land.sh <branch> [auto|none|patch|minor|major]   # level defaults to auto
#
# Every landing on main goes through here, regardless of who produces the commit
# (Self-Improve watcher, autonomous dev-loop, manual merge). The bump follows
# Conventional Commits: by default (auto) the level is DERIVED from the branch's
# commits via .claude/hooks/bump-level.sh — feat→minor, fix/perf→patch, breaking→
# major, and a chore/docs/etc-only branch → NONE (no bump, a chore landing). Pass an
# explicit level to override. See docs/superpowers/specs/2026-06-15-universal-versioning-design.md.
#
# Steps: assert main (cwd-independent) → fetch + ff-only → derive level → merge --no-ff
#        → npm version <level> (unless none) → gate → push (behind-origin guard) → print version.
#
# On any failure after the bump, main + package.json are reset to origin/main so
# main is never left half-versioned or red. The new version is the LAST line of
# stdout so callers (e.g. the watcher) can capture it.
set -uo pipefail

die() { echo "✗ land: $*" >&2; exit 1; }

BRANCH="${1:-}"
LEVEL="${2:-auto}"
[ -n "$BRANCH" ] || die "usage: land.sh <branch> [auto|none|patch|minor|major]"
case "$LEVEL" in auto|none|patch|minor|major) ;; *) die "level must be auto|none|patch|minor|major (got '$LEVEL')" ;; esac

# ROOT = the MAIN worktree, always the first entry of `git worktree list`.
# Immune to cwd-drift: works the same whether invoked from main or a worktree.
ROOT=$(git worktree list --porcelain 2>/dev/null | awk '/^worktree /{print $2; exit}')
[ -n "$ROOT" ] && [ -d "$ROOT" ] || die "could not resolve main worktree root"
g() { git -C "$ROOT" "$@"; }

# Hard branch assertion — never bump/merge from a worktree branch.
CUR=$(g rev-parse --abbrev-ref HEAD)
[ "$CUR" = "main" ] || die "HEAD of $ROOT is '$CUR', not 'main' — refusing to land"
g rev-parse --verify --quiet "$BRANCH" >/dev/null || die "branch '$BRANCH' not found"

echo "▶ land: $BRANCH → main ($LEVEL bump) in $ROOT" >&2

# 1. Stay current with origin (the live watcher also pushes to main).
g fetch origin >&2 || die "git fetch failed"
g merge --ff-only origin/main >&2 || die "main diverged from origin/main — resolve manually"

# Capture the pre-landing tip so failures roll back HERE, never to origin/main
# (origin may be behind by legit unpushed commits — resetting to it would lose them).
START=$(g rev-parse HEAD) || die "cannot read HEAD"

# Resolve 'auto' to a concrete level from the branch's commits (Conventional Commits).
# Same helper the pre-push hook uses, so land and guardrail can never disagree.
if [ "$LEVEL" = "auto" ]; then
  LEVEL=$(bash "$ROOT/.claude/hooks/bump-level.sh" "$ROOT" "$START..$BRANCH") || die "could not derive bump level"
  echo "▶ auto-derived bump level: $LEVEL" >&2
fi

# 2. Stage the merge WITHOUT committing, so the bump can fold into the same commit.
if ! g merge --no-ff --no-commit "$BRANCH" >&2; then
  g merge --abort 2>/dev/null
  g reset --hard "$START" >&2
  die "merge conflict landing '$BRANCH' — reset to start, nothing landed"
fi

# 3. Bump in place (unless level is 'none' — a chore landing), then commit it AS the
# merge commit (MERGE_HEAD is set, so this single commit carries both parents + the bump).
if [ "$LEVEL" = "none" ]; then
  NEW_VERSION=$(node -e "process.stdout.write(require('$ROOT/package.json').version)")
  g commit -m "Merge $BRANCH (no bump — chore)" >&2 || { g reset --hard "$START" >&2; die "commit failed"; }
  echo "▶ landed merge, no version bump (chore) — still $NEW_VERSION" >&2
else
  ( cd "$ROOT" && npm version "$LEVEL" --no-git-tag-version >/dev/null ) || { g merge --abort 2>/dev/null; g reset --hard "$START" >&2; die "npm version $LEVEL failed"; }
  NEW_VERSION=$(node -e "process.stdout.write(require('$ROOT/package.json').version)")
  g add package.json package-lock.json >&2 2>/dev/null || true
  g commit -m "Merge $BRANCH (v$NEW_VERSION)" >&2 || { g reset --hard "$START" >&2; die "commit failed"; }
  echo "▶ landed merge, bumped to $NEW_VERSION" >&2
fi

# 4. Gate on the merge result; undo everything (bump + merge) if red.
if ! ( cd "$ROOT" && CLAUDE_GATE=1 bash .claude/hooks/gate.sh ) >&2; then
  g reset --hard "$START" >&2
  die "gate failed on merge result — reset to start, nothing landed"
fi

# 5. Push, with a behind-origin guard (re-sync + retry once).
if ! g push origin main >&2; then
  echo "▶ push rejected — re-syncing and retrying" >&2
  g fetch origin >&2
  g merge --ff-only origin/main >&2 || die "diverged on retry — resolve manually (work is committed locally)"
  g push origin main >&2 || die "push still rejected after re-sync (work is committed locally)"
fi

echo "✓ landed $BRANCH → main as v$NEW_VERSION" >&2
# LAST line of stdout = the new version, for callers to capture.
echo "$NEW_VERSION"
