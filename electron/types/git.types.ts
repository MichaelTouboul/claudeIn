/** Which diff scope to compute for a repo. */
export const DiffMode = { Working: "working", Branch: "branch" } as const;
export type DiffMode = (typeof DiffMode)[keyof typeof DiffMode];

/** A changed file's status in a diff. */
export const FileStatus = {
  Added: "added",
  Modified: "modified",
  Deleted: "deleted",
  Renamed: "renamed",
  Binary: "binary",
} as const;
export type FileStatus = (typeof FileStatus)[keyof typeof FileStatus];

/** A single line's role inside a hunk. `hunk` is the `@@ … @@` separator row. */
export const GitLineKind = {
  Add: "add",
  Del: "del",
  Context: "context",
  Hunk: "hunk",
} as const;
export type GitLineKind = (typeof GitLineKind)[keyof typeof GitLineKind];

export interface GitDiffLine {
  kind: GitLineKind;
  text: string;
  oldLine: number | null;
  newLine: number | null;
}

export interface GitDiffHunk {
  header: string;
  lines: GitDiffLine[];
}

export interface RepoFileDiff {
  path: string;
  oldPath?: string;
  status: FileStatus;
  additions: number;
  deletions: number;
  binary: boolean;
  hunks: GitDiffHunk[];
}

export interface RepoDiff {
  mode: DiffMode;
  base?: string;
  files: RepoFileDiff[];
  truncated: boolean;
  error?: string;
}

/** One git worktree as reported by `git worktree list --porcelain`. */
export interface GitWorktree {
  path: string;
  /** The checked-out branch (short name), or null when detached. */
  branch: string | null;
  detached: boolean;
}

/** The branch/worktree state for a repo, fed to the composer status strip. */
export interface GitBranchInfo {
  /** The repo's current branch (short name), or null when detached/unknown. */
  current: string | null;
  worktrees: GitWorktree[];
  error?: string;
}

/**
 * Diff/commit stats for ONE worktree vs the repo's default base (`_main`/`main`/
 * `master`), computed for the Worktrees panel cards. `additions`/`deletions` are
 * the summed line counts of `git diff --numstat <mergeBase>...HEAD`; `ahead` is
 * the commit count `git rev-list --count <base>..<branch>`. All zero when the
 * worktree IS the base, or on any failure (`error` set, never thrown).
 */
export interface WorktreeStat {
  /** The worktree path this stat belongs to (the join key on the renderer side). */
  path: string;
  additions: number;
  deletions: number;
  ahead: number;
  /** The base branch the stats were computed against, or null when none found. */
  base: string | null;
  error?: string;
}

/** Result of a worktree mutation (add/remove/merge). Never throws — `ok` + message. */
export interface WorktreeOpResult {
  ok: boolean;
  /** Combined stdout/stderr from git, surfaced verbatim on failure (no faking). */
  message: string;
}

/**
 * One repo's full worktree slice for the user-scope (all-repos) aggregation: its
 * live branch/worktree list plus the per-worktree diff/ahead stats. The renderer
 * joins `branchInfo.worktrees` with `stats` (by path) into rows exactly like the
 * per-repo panel — this is the per-repo data, batched. A failed repo carries its
 * `branchInfo.error` and an empty `stats` (never throws — one bad repo can't break
 * the batch).
 */
export interface RepoWorktrees {
  repoPath: string;
  branchInfo: GitBranchInfo;
  stats: WorktreeStat[];
}
