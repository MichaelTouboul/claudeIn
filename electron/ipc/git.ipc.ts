import { ipcMain } from "electron";

import { loadGitBranchInfo, loadRepoDiff } from "../services/git/git.service";
import { unwatchGitBranch, watchGitBranch } from "../services/git/git.watch";
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
}
