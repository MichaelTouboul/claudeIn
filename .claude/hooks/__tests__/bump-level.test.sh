#!/usr/bin/env bash
# Test harness for bump-level.sh — builds a throwaway git repo, lays down commits
# with known Conventional-Commit subjects, and asserts the derived level per range.
set -uo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
BUMP="$HERE/../bump-level.sh"

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
git -C "$TMP" init -q
git -C "$TMP" config user.email t@t.t
git -C "$TMP" config user.name t

pass=0 fail=0
commit() { git -C "$TMP" commit -q --allow-empty -m "$1"; }
at() { git -C "$TMP" rev-parse HEAD; }
expect() { # <range> <want>
  local got; got=$(bash "$BUMP" "$TMP" "$1")
  if [ "$got" = "$2" ]; then pass=$((pass+1)); else
    fail=$((fail+1)); echo "  ✗ range '$1': want '$2', got '$got'" >&2
  fi
}

commit "chore: initial";            C_CHORE=$(at)
commit "docs: readme";              C_DOCS=$(at)
commit "fix: a bug";                C_FIX=$(at)
commit "feat: a feature";           C_FEAT=$(at)
commit "feat!: breaking feature";   C_BREAK=$(at)
commit "random non-conventional";   C_UNKNOWN=$(at)
commit "perf(api): faster";         C_PERF=$(at)

# Single-commit ranges (parent..self).
expect "$C_CHORE..$C_DOCS"   none     # docs only
expect "$C_DOCS..$C_FIX"     patch    # fix
expect "$C_FIX..$C_FEAT"     minor    # feat
expect "$C_FEAT..$C_BREAK"   major    # feat! breaking
expect "$C_BREAK..$C_UNKNOWN" patch   # non-conventional -> patch (safety)
expect "$C_UNKNOWN..$C_PERF" patch    # perf -> patch

# Multi-commit ranges — highest wins.
expect "$C_CHORE..$C_FIX"    patch    # docs + fix
expect "$C_DOCS..$C_FEAT"    minor    # fix + feat
expect "$C_FIX..$C_BREAK"    major    # feat + breaking
expect "$C_CHORE..$C_DOCS"   none     # chore-only span

# Empty range -> none.
expect "$C_PERF..$C_PERF"    none

# A "BREAKING CHANGE:" footer (not a bang) still -> major.
git -C "$TMP" commit -q --allow-empty -m "$(printf 'feat: thing\n\nBREAKING CHANGE: drops X')"
C_FOOTER=$(at)
expect "$C_PERF..$C_FOOTER"  major

echo "bump-level: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
