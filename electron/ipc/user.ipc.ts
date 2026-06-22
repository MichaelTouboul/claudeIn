import { ipcMain } from "electron";

import { fillUserProfile, locateClaudeUser } from "../services/search/user-search.service";
import {
  completeOnboarding,
  getUserProfile,
  resetUser,
  saveUserProfile,
} from "../services/profile/user-profile.service";
import { scanRepos, scanSingleRepo } from "../services/projects/repos.service";
import { add, list, remove } from "../services/projects/favorite-repos.service";
import type { UserProfile } from "../types/user.interface";

/**
 * User onboarding + favorite-repos IPC. Thin adapters delegating to
 * `user-search.service` (locate + profile build), `user-profile.service`
 * (persistence), `repos.service` (project-repo scan), and
 * `favorite-repos.service`. Channels follow `domain:action`:
 *   user:locate         → locateClaudeUser()        → string | null
 *   user:buildProfile   → fillUserProfile(path)      → UserProfile
 *   user:getProfile     → getUserProfile()           → UserProfile | null
 *   user:saveProfile    → saveUserProfile(profile)    → UserProfile
 *   user:complete       → completeOnboarding()        → UserProfile
 *   user:reset          → resetUser()                 → void
 *   repos:scan          → scanRepos(root?)            → RepoCandidate[]
 *   repos:scan-single   → scanSingleRepo(path)        → RepoCandidate | null
 *   favoriteRepos:list  → list()                      → FavoriteRepo[]
 *   favoriteRepos:add   → add(path, label?, logo?)    → FavoriteRepo
 *   favoriteRepos:remove→ remove(path)                → void
 */
export function registerUserHandlers(): void {
  ipcMain.handle("user:locate", () => locateClaudeUser());
  ipcMain.handle("user:buildProfile", (_e, claudePath: string) => fillUserProfile(claudePath));
  ipcMain.handle("user:getProfile", () => getUserProfile());
  ipcMain.handle("user:saveProfile", (_e, profile: UserProfile) => saveUserProfile(profile));
  ipcMain.handle("user:complete", () => completeOnboarding());
  ipcMain.handle("user:reset", () => resetUser());

  ipcMain.handle("repos:scan", (_e, root?: string) => scanRepos(root));
  ipcMain.handle("repos:scan-single", (_e, repoPath: string) => scanSingleRepo(repoPath));

  ipcMain.handle("favoriteRepos:list", () => list());
  ipcMain.handle("favoriteRepos:add", (_e, repoPath: string, label?: string, logoDataUrl?: string | null) =>
    add(repoPath, label, logoDataUrl),
  );
  ipcMain.handle("favoriteRepos:remove", (_e, repoPath: string) => remove(repoPath));
}
