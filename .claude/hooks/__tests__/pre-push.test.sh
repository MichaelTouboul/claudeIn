#!/usr/bin/env bash
# Integration test for the pre-push guardrail + its bump-level derivation, end to end.
# Builds a bare "origin" and a work repo wired with the REAL hook scripts via
# core.hooksPath, then asserts which pushes to main are accepted vs rejected.
set -uo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
SRC="$HERE/.."                       # .claude/hooks
pass=0 fail=0
ok()  { pass=$((pass+1)); }
bad() { fail=$((fail+1)); echo "  ✗ $1" >&2; }

TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
git init -q --bare "$TMP/origin.git"
W="$TMP/work"; git init -q "$W"
git -C "$W" config user.email t@t.t; git -C "$W" config user.name t
git -C "$W" remote add origin "$TMP/origin.git"

# Wire the real hooks into the work repo.
mkdir -p "$W/.claude/hooks" "$W/.claude/githooks"
cp "$SRC/bump-level.sh" "$W/.claude/hooks/bump-level.sh"
cp "$SRC/../githooks/pre-push" "$W/.claude/githooks/pre-push"
chmod +x "$W/.claude/hooks/bump-level.sh" "$W/.claude/githooks/pre-push"
git -C "$W" config core.hooksPath .claude/githooks

setver() { node -e "const fs=require('fs');const f='$W/package.json';let p={};try{p=JSON.parse(fs.readFileSync(f))}catch{}p.version='$1';fs.writeFileSync(f,JSON.stringify(p,null,2))"; }
commit() { git -C "$W" add -A; git -C "$W" commit -q --allow-empty -m "$1"; }
push()   { git -C "$W" push -q origin main 2>/dev/null; }  # 0 = accepted, non-0 = rejected

setver 1.0.0; commit "chore: init"
push && ok || bad "initial main push (version exists) should be ACCEPTED"

# feat without a bump -> rejected.
commit "feat: a feature"
push && bad "feat with no bump should be REJECTED" || ok

# bump -> accepted.
setver 1.1.0; commit "chore: release 1.1.0"
push && ok || bad "feat + bump should be ACCEPTED"

# chore-only, no bump -> accepted (level none).
commit "docs: tweak readme"
push && ok || bad "docs-only with no bump should be ACCEPTED"

# non-conventional commit, no bump -> rejected (safety: unknown -> patch).
commit "just fixing stuff"
push && bad "non-conventional commit with no bump should be REJECTED" || ok

# after the rejection, a bump rescues it -> accepted.
setver 1.1.1; commit "chore: release 1.1.1"
push && ok || bad "non-conventional + bump should be ACCEPTED"

echo "pre-push: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
