import { ipcMain } from "electron";

import { loadGitBranchInfo, loadRepoDiff } from "../services/git/git.service";
import { unwatchGitBranch, watchGitBranch } from "../services/git/git.watch";
import { loadAllRepoWorktrees } from "../services/git/git.worktree.aggregate";
import {
  addWorktree,
  loadWorktreeStats,
  mergeWorktree,
  removeWorktree,
} from "../services/git/git.worktree";
import type { DiffMode } from "../types/git.types";

export function registerGitHandlers(): void {
  ipcMain.handle("git:diff", (_e, repoPath: string, mode: DiffMode) =>
    loadRepoDiff(repoPath, mode));
  ipcMain.handle("git:branches", (_e, repoPath: string) =>
    loadGitBranchInfo(repoPath));
  ipcMain.handle("git:watch-branch", (_e, repoPath: string) =>
    watchGitBranch(repoPath));
  ipcMain.handle("git:unwatch-branch", (_e, repoPath: string) =>
    unwatchGitBranch(repoPath));
  ipcMain.handle("git:worktree-stats", (_e, repoPath: string) =>
    loadWorktreeStats(repoPath));
  ipcMain.handle("git:worktrees-all-repos", (_e, repoPaths: string[]) =>
    loadAllRepoWorktrees(repoPaths));
  ipcMain.handle("git:worktree-add", (_e, repoPath: string, branch: string) =>
    addWorktree(repoPath, branch));
  ipcMain.handle(
    "git:worktree-remove",
    (_e, repoPath: string, worktreeTarget: string, force: boolean) =>
      removeWorktree(repoPath, worktreeTarget, force),
  );
  ipcMain.handle("git:worktree-merge", (_e, repoPath: string, branch: string) =>
    mergeWorktree(repoPath, branch));
}
