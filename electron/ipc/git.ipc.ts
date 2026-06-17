import { ipcMain } from "electron";

import { loadRepoDiff } from "../services/git/git.service";
import type { DiffMode } from "../types/git.types";

export function registerGitHandlers(): void {
  ipcMain.handle("git:diff", (_e, repoPath: string, mode: DiffMode) =>
    loadRepoDiff(repoPath, mode));
}
