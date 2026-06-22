import type { RepoWorktrees } from "../../types/git.types";
import { loadGitBranchInfo } from "./git.service";
import { loadWorktreeStats } from "./git.worktree";

/**
 * The user-scope (all-repos) worktree aggregation: for EACH known repo path, load
 * its live branch/worktree list and per-worktree diff/ahead stats — the exact same
 * per-repo data the scoped panel uses, batched across the user's repositories.
 *
 * Repo paths are deduped (a repo listed twice yields one entry). Each repo is
 * resolved independently and a failure is isolated: a non-git or unreadable path
 * comes back with its `branchInfo.error` set and empty `stats` rather than failing
 * the whole batch. Order follows the (deduped) input order.
 */
export async function loadAllRepoWorktrees(repoPaths: string[]): Promise<RepoWorktrees[]> {
  const unique = [...new Set(repoPaths)];
  return Promise.all(
    unique.map(async (repoPath): Promise<RepoWorktrees> => {
      const branchInfo = await loadGitBranchInfo(repoPath);
      // A repo that failed to enumerate has no worktrees to stat — skip the work.
      const stats = branchInfo.error ? [] : await loadWorktreeStats(repoPath);
      return { repoPath, branchInfo, stats };
    }),
  );
}
