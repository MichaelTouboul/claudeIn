import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { WorktreeOpResult, WorktreeStat } from "../../types/git.types";
import { loadGitBranchInfo } from "./git.service";
import {
  mergeBranchArgs,
  worktreeAddArgs,
  worktreePath,
  worktreeRemoveArgs,
} from "./git.worktree.args";

const run = promisify(execFile);
const TIMEOUT = 15_000;
const MAX_BUFFER = 16 * 1024 * 1024;

/** Run a git command, returning trimmed stdout. Throws on a non-zero exit. */
async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await run("git", args, { cwd, timeout: TIMEOUT, maxBuffer: MAX_BUFFER });
  return stdout.trim();
}

/** Combine an error's stdout/stderr into one verbatim message (no faking). */
function errMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as { stderr?: string; stdout?: string; message?: string };
    const text = `${e.stdout ?? ""}${e.stderr ?? ""}`.trim();
    if (text) return text;
    if (e.message) return e.message;
  }
  return "git failed";
}

/**
 * Resolve the repo's default base branch (`_main` → `main` → `master` →
 * `origin/HEAD`), returning the short name or null. `_main` is checked first
 * because this app's own convention names the trunk `_main`.
 */
async function defaultBase(cwd: string): Promise<string | null> {
  for (const ref of ["_main", "main", "master", "origin/HEAD"]) {
    try {
      const out = await git(cwd, ["rev-parse", "--abbrev-ref", ref]);
      if (out && out !== "HEAD") return out.replace(/^origin\//, "");
    } catch {
      /* try next */
    }
  }
  return null;
}

const ZERO = { additions: 0, deletions: 0, ahead: 0 } as const;

/**
 * Diff/commit stats for ONE worktree vs the repo's default base. `worktreeCwd` is
 * the worktree's own directory (so the diff is computed from its HEAD); `repoPath`
 * resolves the base ref. Returns all-zero with `error` on any failure — never
 * throws — so a single bad worktree can't break the whole panel's card list.
 */
export async function loadWorktreeStat(
  worktreeCwd: string,
  repoPath: string,
  branch: string | null,
): Promise<WorktreeStat> {
  try {
    // A non-git path is a genuine error, not a "no base" no-op — surface it.
    await git(worktreeCwd, ["rev-parse", "--is-inside-work-tree"]);
    const base = await defaultBase(repoPath);
    // The worktree IS the base (or no base resolvable) → nothing ahead/changed.
    if (!base || branch === base) {
      return { path: worktreeCwd, ...ZERO, base };
    }
    const mergeBase = await git(worktreeCwd, ["merge-base", base, "HEAD"]);
    const numstat = await git(worktreeCwd, ["diff", "--numstat", `${mergeBase}...HEAD`]);
    const { additions, deletions } = sumNumstat(numstat);
    const aheadRaw = await git(worktreeCwd, ["rev-list", "--count", `${mergeBase}..HEAD`]);
    const ahead = Number.parseInt(aheadRaw, 10);
    return {
      path: worktreeCwd,
      additions,
      deletions,
      ahead: Number.isFinite(ahead) ? ahead : 0,
      base,
    };
  } catch (err) {
    return { path: worktreeCwd, ...ZERO, base: null, error: errMessage(err) };
  }
}

/**
 * Stats for EVERY worktree of `repoPath`, keyed by path (the renderer joins these
 * onto the live `GitBranchInfo.worktrees` list). Each worktree is statted from its
 * own directory; failures are isolated per-worktree (a bad one returns an `error`
 * stat rather than failing the batch). Returns `[]` for a non-git path.
 */
export async function loadWorktreeStats(repoPath: string): Promise<WorktreeStat[]> {
  const info = await loadGitBranchInfo(repoPath);
  if (info.error) return [];
  return Promise.all(
    info.worktrees.map((wt) => loadWorktreeStat(wt.path, repoPath, wt.branch)),
  );
}

/** Sum `git diff --numstat` rows into total adds/dels (binary rows show `-`). */
function sumNumstat(numstat: string): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  for (const line of numstat.split("\n")) {
    const [a, d] = line.split("\t");
    const av = Number.parseInt(a, 10);
    const dv = Number.parseInt(d, 10);
    if (Number.isFinite(av)) additions += av;
    if (Number.isFinite(dv)) deletions += dv;
  }
  return { additions, deletions };
}

/**
 * Create a new worktree for `branch` under `<repo>/.worktrees/<branch>`. Creates
 * the branch if it does not exist, else checks the existing one out. Returns the
 * git output verbatim on failure (e.g. branch already checked out) — never fakes.
 */
export async function addWorktree(repoPath: string, branch: string): Promise<WorktreeOpResult> {
  const target = worktreePath(repoPath, branch);
  const exists = await branchExists(repoPath, branch);
  try {
    const out = await git(repoPath, worktreeAddArgs(target, branch, !exists));
    return { ok: true, message: out };
  } catch (err) {
    return { ok: false, message: errMessage(err) };
  }
}

/** Whether a local branch already exists (so add knows whether to pass `-b`). */
async function branchExists(repoPath: string, branch: string): Promise<boolean> {
  try {
    await git(repoPath, ["rev-parse", "--verify", `refs/heads/${branch}`]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove a worktree directory. `force` drops git's uncommitted-changes guard
 * (the UI gates this behind an explicit confirm). Output surfaced verbatim.
 */
export async function removeWorktree(
  repoPath: string,
  worktreeTarget: string,
  force: boolean,
): Promise<WorktreeOpResult> {
  try {
    const out = await git(repoPath, worktreeRemoveArgs(worktreeTarget, force));
    return { ok: true, message: out };
  } catch (err) {
    return { ok: false, message: errMessage(err) };
  }
}

/**
 * Merge `branch` into the repo's default base. Runs from `repoPath` (the base
 * checkout) with `--no-edit` so it never blocks on an editor; a conflict or any
 * non-zero exit is returned as `ok:false` with git's verbatim message — we do NOT
 * pretend success or auto-resolve conflicts.
 */
export async function mergeWorktree(repoPath: string, branch: string): Promise<WorktreeOpResult> {
  try {
    const out = await git(repoPath, mergeBranchArgs(branch));
    return { ok: true, message: out };
  } catch (err) {
    return { ok: false, message: errMessage(err) };
  }
}
