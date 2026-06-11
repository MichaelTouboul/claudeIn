import { useCallback, useEffect, useRef, useState } from "react";

import type { UserProfile } from "@/types/user.types";

import { SearchPhase } from "./searchPhase";

export type UseUserSearch = {
  phase: SearchPhase;
  /** Build the profile from an explicit `.claude` path (picker result). */
  buildFrom: (claudePath: string) => Promise<void>;
  /** Re-run the automatic locate → build pass (after an error). */
  retry: () => Promise<void>;
};

/**
 * SearchUser logic: on mount, `locate` the user `.claude`; when found, build the
 * profile and hand it back via `onProfile`. A null locate surfaces the
 * LocateFailed phase so the step can open the folder picker, then `buildFrom`
 * the chosen path. Any rejection lands on Error with a retry.
 */
export function useUserSearch(onProfile: (profile: UserProfile) => void): UseUserSearch {
  const [phase, setPhase] = useState<SearchPhase>(SearchPhase.Working);
  // Keep the latest callback without re-running the locate effect on each render.
  const onProfileRef = useRef(onProfile);
  onProfileRef.current = onProfile;

  const buildFrom = useCallback(async (claudePath: string) => {
    setPhase(SearchPhase.Working);
    try {
      const profile = await window.api.buildUserProfile(claudePath);
      onProfileRef.current(profile);
    } catch {
      setPhase(SearchPhase.Error);
    }
  }, []);

  const locateThenBuild = useCallback(async () => {
    setPhase(SearchPhase.Working);
    try {
      const path = await window.api.locateClaudeUser();
      if (path === null) {
        setPhase(SearchPhase.LocateFailed);
        return;
      }
      await buildFrom(path);
    } catch {
      setPhase(SearchPhase.Error);
    }
  }, [buildFrom]);

  useEffect(() => {
    void locateThenBuild();
  }, [locateThenBuild]);

  return { phase, buildFrom, retry: locateThenBuild };
}
