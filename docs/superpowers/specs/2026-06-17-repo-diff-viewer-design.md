# Repo Diff Viewer — Design

**Date:** 2026-06-17
**Status:** Approved (brainstorming) — pending implementation plan

## Summary

A read-only viewer for the **git diff of the currently selected project**, surfaced
as a new tab in the right-side **UtilityPanel**. It shows two diff scopes, switchable
with a toggle:

- **Working tree** — uncommitted changes (staged + unstaged) vs `HEAD`, plus
  untracked files shown as added.
- **Branch vs base** — everything on the current branch since it diverged from the
  repo's default branch (`main`/`master`), i.e. `git diff <merge-base>...HEAD`.

Each changed file renders with the existing **DiffBlock** colorized rendering, including
the per-line **"Ask Claude about this line"** interaction, but pointed at real repo files.

This fills the gap identified in the codebase: there is currently **no git-diff
surface** — the only diff feature is the inline rendering of an agent's Edit/Write/
MultiEdit tool output inside a chat message. This feature is independent of that.

## Goals

- See the real working-tree changes of the selected repo without leaving the app.
- See the branch's accumulated changes vs its base branch.
- Reuse the established DiffBlock rendering + per-line Ask-Claude affordance.
- Strictly read-only and crash-safe; never mutates the repo or its git state.

## Non-goals (YAGNI for v1)

- No staging / unstaging / discarding / committing (read-only).
- No live filesystem watcher — refresh is manual (button) + on open + on toggle change.
- No base-branch picker UI — base is auto-detected; configurability is a later concern.
- No per-commit / commit-range browser (scope is working + branch only).
- No diff for non-selected projects (always the active `selectedProject`).

## Architecture overview

```
Header "Changes" button ──opens──▶ UtilityPanel tab (PanelTabKind.Diff)
                                        │
                                        ▼
                              DiffTab (renderer)
                                 │  window.api.gitDiff(repoPath, mode)
                                 ▼
        electron: git:diff IPC ─▶ git.service (read-only `git` spawns)
                                 ─▶ git.parse (hand-rolled unified-diff parser)
                                 ◀─ RepoDiff (git-native structured model)
                                        │
                            renderer maps RepoFileDiff ─▶ FileDiff ─▶ DiffBlock
```

The backend stays git-pure (produces a git-native `RepoDiff`); the renderer stays
rendering-pure (maps to the existing DiffBlock model). No third-party dependency:
the unified-diff parser is hand-rolled and unit-tested (decision: zero-dep, option A).

## Data model — `electron/types/git.types.ts` (shared, declared in `env.d.ts`)

Finite sets modeled as `as const` enums + value→behavior maps (per CLAUDE.md), never
fallback chains.

```ts
DiffMode    = 'working' | 'branch'
FileStatus  = 'added' | 'modified' | 'deleted' | 'renamed' | 'binary'
GitLineKind = 'add' | 'del' | 'context' | 'hunk'   // 'hunk' = the @@ header row

interface GitDiffLine { kind: GitLineKind; text: string; oldLine: number | null; newLine: number | null }
interface GitDiffHunk { header: string; lines: GitDiffLine[] }
interface RepoFileDiff {
  path: string;          // new path (or old path for a deletion)
  oldPath?: string;      // present for renames
  status: FileStatus;
  additions: number;
  deletions: number;
  binary: boolean;
  hunks: GitDiffHunk[];  // empty for binary / pure-rename
}
interface RepoDiff {
  mode: DiffMode;
  base?: string;         // the base ref used in 'branch' mode (e.g. "main")
  files: RepoFileDiff[];
  truncated: boolean;    // true if bounded caps were hit
  error?: string;        // friendly message for non-repo / no-commits / git failure
}
```

## Backend — `electron/services/git/` (read-only)

`git.service.ts`:
- `isGitRepo(repoPath)` — `git rev-parse --is-inside-work-tree`.
- `getWorkingDiff(repoPath)` — `git diff HEAD` (staged + unstaged vs HEAD) **plus**
  untracked files from `git ls-files --others --exclude-standard`, each read from disk
  and synthesized as an `added` `RepoFileDiff`. Read-only — no `git add -N`.
- `getBranchDiff(repoPath)` — resolve the default branch (`git rev-parse --abbrev-ref
  origin/HEAD`, fallback `main`/`master`), compute `git merge-base HEAD <base>`, then
  `git diff <merge-base>...HEAD`. If no base / no commits / detached HEAD → return a
  `RepoDiff` with an `error` and empty `files`.
- All `git` invocations are spawned with a **timeout** and an explicit read-only
  argument list; output captured and handed to the parser.

`git.parse.ts` — pure, **node-free**, unit-tested unified-diff parser → `RepoFileDiff[]`.
Handles: `diff --git a/… b/…`, `--- /dev/null` / `+++ /dev/null`, `rename from` /
`rename to`, `new file mode` / `deleted file mode`, `Binary files … differ`,
`@@ -a,b +c,d @@` hunk headers (tracking old/new line numbers), context/add/del lines,
and `\ No newline at end of file`. **Bounded**: caps on total files and lines per file;
on overflow set `truncated = true` and stop (never unbounded memory).

IPC (the full electron loop):
- `electron/ipc/git.ipc.ts` — `ipcMain.handle("git:diff", …)` → `{ repoPath, mode }` →
  `RepoDiff`. Registered via `ipc/index.ts`.
- `electron/preload.ts` — `window.api.gitDiff(repoPath: string, mode: DiffMode)`.
- `src/env.d.ts` — typed signature on the `window.api` interface.

## Renderer — Diff panel tab

- `PanelTabKind.Diff` added to `usePanelStore` (panel kind enum + behavior map).
- **`DiffTab`** component under the UtilityPanel:
  - Header: a **Working tree ⇄ Branch vs <base>** toggle, a **Refresh** button, the base
    branch name (in branch mode), and a summary (`N files, +X −Y`).
  - Body: a list of files; each `RepoFileDiff` mapped to the existing `FileDiff` and
    rendered by **DiffBlock**, with the per-line **Ask Claude** affordance reused
    unchanged (it already takes file path + surrounding lines via `askContext`).
- **DiffBlock extension** (minimal): support a `hunk` line kind (the `@@` separator row)
  and binary / empty / renamed states. Existing chat-message diffs are unaffected.
- **Entry point**: a **"Changes"** button (git-branch icon) in the **Header**, opening
  the Diff panel tab for `selectedProject`.
- **Fetching**: `window.api.gitDiff(selectedProject.path, mode)` on open, on Refresh, and
  on toggle change. No watcher (manual refresh).

## Data flow

1. User clicks **Changes** in the Header → opens the Diff UtilityPanel tab.
2. `DiffTab` mounts → calls `gitDiff(repoPath, 'working')`.
3. Backend runs read-only `git`, parses → `RepoDiff`.
4. Renderer maps `RepoFileDiff[]` → `FileDiff[]` → DiffBlock renders each; Ask-Claude
   per line works on the real file lines.
5. Toggle → re-fetch with `'branch'`; Refresh → re-fetch current mode.

## Error & empty states

| Condition | Behavior |
|---|---|
| Not a git repo | Empty state: "Not a git repository" |
| No changes (working) | Empty state: "No changes" |
| No commits / detached HEAD / no base (branch) | Message; branch toggle disabled or noted |
| `git` missing / timeout / non-zero exit | Non-crashing error state with a short message |
| Very large diff | Render what fits; show a "diff truncated" notice (`truncated`) |

Every backend read is crash-safe (try/catch, degrade to an `error` field — never throws
across the IPC boundary).

## Testing

- **Backend parser** (`electron/services/__tests__/`): unit tests for every edge case —
  added / modified / deleted / renamed / binary / no-newline-at-EOF / multi-hunk /
  untracked, plus the truncation cap.
- **Backend git service**: integration test against a **temporary git repo fixture**
  (init repo, make changes, run service, assert `RepoDiff`).
- **Renderer** (`src/components/__tests__/`): `DiffTab` renders the file list + toggle,
  maps `RepoDiff` → `FileDiff`, shows empty/error states, and keeps the Ask-Claude wiring.
- **DiffBlock**: the new `hunk` line kind + binary/empty states render correctly; existing
  chat-diff tests stay green.

## Conventions

Standard project rules apply: no `any`; named imports; 300-line hard limit (split into
sub-modules/sub-components as needed); 0 lint errors AND warnings; `tsc` clean; finite
state as enum + value→behavior map. Lands via `land.sh` (`feat:` → minor bump).
