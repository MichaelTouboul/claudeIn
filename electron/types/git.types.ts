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
