/**
 * Pure git-argument builders for the worktree mutations exposed by the Worktrees
 * panel. Kept side-effect-free so the exact argv each op runs is unit-testable
 * without touching a real repo (the service in `git.worktree.ts` just feeds these
 * to `execFile`). A new worktree is placed under `<repo>/.worktrees/<branch>` by
 * default, mirroring how the app already nests linked checkouts.
 */
import path from "node:path";

/** Where a freshly-created worktree lives, derived from the repo + branch name. */
export function worktreePath(repoPath: string, branch: string): string {
  // Flatten any slashes in a branch name (feature/x) into a single safe segment.
  const safe = branch.replace(/[/\\]+/g, "-");
  return path.join(repoPath, ".worktrees", safe);
}

/**
 * `git worktree add` argv. When the branch does not yet exist we create it with
 * `-b`; otherwise we check the existing branch out into the new worktree dir.
 */
export function worktreeAddArgs(
  targetPath: string,
  branch: string,
  createBranch: boolean,
): string[] {
  return createBranch
    ? ["worktree", "add", "-b", branch, targetPath]
    : ["worktree", "add", targetPath, branch];
}

/**
 * `git worktree remove` argv. `force` drops the safety check that refuses to
 * remove a worktree with uncommitted changes (the UI gates it behind a confirm).
 */
export function worktreeRemoveArgs(targetPath: string, force: boolean): string[] {
  return force
    ? ["worktree", "remove", "--force", targetPath]
    : ["worktree", "remove", targetPath];
}

/**
 * `git merge` argv used to merge a worktree's branch into the base. Run from the
 * BASE worktree's cwd; `--no-edit` keeps it non-interactive (never blocks on an
 * editor) so a clean fast-forward/merge completes and a conflict surfaces as a
 * non-zero exit we can report verbatim.
 */
export function mergeBranchArgs(branch: string): string[] {
  return ["merge", "--no-edit", branch];
}
