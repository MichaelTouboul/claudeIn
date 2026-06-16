#!/usr/bin/env bash
# Derive the SemVer bump level implied by a RANGE of commits, per Conventional Commits.
# Single source of truth shared by land.sh (to pick the bump) and the pre-push hook
# (to re-verify it) — so the two can never disagree.
#
#   bump-level.sh <root> <range>     # e.g. bump-level.sh "$ROOT" "origin/main..my-branch"
#
# Prints exactly one of: major | minor | patch | none   (highest wins across the range)
#
#   breaking  (type! in subject, or a "BREAKING CHANGE:" footer)  -> major
#   feat                                                          -> minor
#   fix | perf | revert                                           -> patch
#   chore | docs | style | refactor | test | ci | build           -> none
#   anything else / non-conventional subject                      -> patch
#
# That last rule is the safety property: only commits whose type is an *explicitly*
# non-releasing Conventional type earn a no-bump landing. A plain "fixed the thing"
# message is treated as a release (patch) and still requires a version bump — so the
# guardrail never mistakes a forgotten bump for an intentional chore.
#
# Merge commits are ignored (--no-merges); they are structural, not content. An empty
# range prints "none".
set -uo pipefail

ROOT="${1:?usage: bump-level.sh <root> <range>}"
RANGE="${2:?usage: bump-level.sh <root> <range>}"

rank() { case "$1" in major) echo 3 ;; minor) echo 2 ;; patch) echo 1 ;; *) echo 0 ;; esac; }

best="none"
upgrade() { [ "$(rank "$1")" -gt "$(rank "$best")" ] && best="$1"; return 0; }

while IFS= read -r -d '' msg; do
  subject="${msg%%$'\n'*}"
  # Breaking: "type!:" / "type(scope)!:" in the subject, or a BREAKING CHANGE footer.
  if printf '%s' "$subject" | grep -qE '^[a-zA-Z]+(\([^)]*\))?!:' \
     || printf '%s' "$msg" | grep -qE '^BREAKING[ -]CHANGE:'; then
    upgrade major
    continue
  fi
  type=$(printf '%s' "$subject" | sed -nE 's/^([a-zA-Z]+)(\([^)]*\))?:.*/\1/p' | tr '[:upper:]' '[:lower:]')
  case "$type" in
    feat)                                     upgrade minor ;;
    fix | perf | revert)                      upgrade patch ;;
    chore | docs | style | refactor | test | ci | build) upgrade none ;;
    *)                                        upgrade patch ;; # unknown / non-conventional -> force a bump
  esac
done < <(git -C "$ROOT" log --no-merges -z --format=%B "$RANGE")

echo "$best"
