import { ipcMain } from "electron";

import { loadGitBranchInfo, loadRepoDiff } from "../services/git/git.service";
import type { DiffMode } from "../types/git.types";

export function registerGitHandlers(): void {
  ipcMain.handle("git:diff", (_e, repoPath: string, mode: DiffMode) =>
    loadRepoDiff(repoPath, mode));
  ipcMain.handle("git:branches", (_e, repoPath: string) =>
    loadGitBranchInfo(repoPath));
}
