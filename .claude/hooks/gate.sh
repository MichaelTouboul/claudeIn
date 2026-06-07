#!/usr/bin/env bash
# Deterministic quality gate for ClaudeIn — chained, short-circuits on first failure.
#
#   Manual:     bash .claude/hooks/gate.sh
#   Autonomous: the Stop hook in .claude/settings.json runs this ONLY when
#               CLAUDE_GATE=1, so interactive sessions aren't blocked by a full
#               build on every turn.
#
# Exit 0 = all green. Exit 2 = a stage failed (failing stage printed to stderr).
set -uo pipefail

cd "$(git rev-parse --show-toplevel)" || exit 1

gate() {
  local label="$1"; shift
  echo "▶ $label"
  if ! "$@"; then
    echo "✗ gate failed: $label" >&2
    exit 2
  fi
  echo "✓ $label"
}

gate "lint (0 warnings)" npm run lint -- --max-warnings 0
gate "typecheck"         npm run typecheck
gate "typecheck:electron" npm run typecheck:electron
gate "build"             npx electron-vite build
gate "tests"             npm test

echo "✓ all gates green"
