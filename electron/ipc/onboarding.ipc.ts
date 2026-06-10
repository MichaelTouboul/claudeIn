import { ipcMain } from "electron";

import { scanCandidates } from "../services/onboarding.service";
import {
  getProfile,
  ingestScope,
  listProfiles,
  refreshProfile,
} from "../services/profile.service";
import type { ScopeProfile } from "../types/onboarding.types";

/**
 * Onboarding + profiles IPC. Thin adapters delegating to `onboarding.service`
 * (filesystem discovery) and `profile.service` (agentic ingest + SQLite
 * persistence). Channels follow `domain:action`:
 *   onboarding:scan    → scanCandidates(root?)        → Candidate[]
 *   onboarding:ingest  → ingestScope(path,scope,...)  → ScopeProfile
 *   profiles:list      → listProfiles()               → ScopeProfile[]
 *   profiles:get       → getProfile(path)             → ScopeProfile | null
 *   profiles:refresh   → refreshProfile(path)         → ScopeProfile
 */
export function registerOnboardingHandlers(): void {
  ipcMain.handle("onboarding:scan", (_e, root?: string) => scanCandidates(root));

  ipcMain.handle(
    "onboarding:ingest",
    (_e, scopePath: string, scope: ScopeProfile["scope"], plugins: string[]) =>
      ingestScope(scopePath, scope, plugins),
  );

  ipcMain.handle("profiles:list", () => listProfiles());
  ipcMain.handle("profiles:get", (_e, scopePath: string) => getProfile(scopePath));
  ipcMain.handle("profiles:refresh", (_e, scopePath: string) => refreshProfile(scopePath));
}
