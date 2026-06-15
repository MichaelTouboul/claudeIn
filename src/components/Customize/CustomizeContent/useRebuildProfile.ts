import { useCallback, useState } from "react";

import type { UserProfile } from "@/lib/types";

export type UseRebuildProfile = {
  /** True while the LLM-backed rebuild subprocess is running. */
  building: boolean;
  /** Inline message when the Claude user dir can't be located, else null. */
  error: string | null;
  /** Locate → build → persist the profile; no-op while already building. */
  rebuild: () => Promise<void>;
};

const LOCATE_FAILED = "Couldn't find your Claude setup. Open Claude Code once, then retry.";

/**
 * Rebuild the user profile from the local Claude setup, on demand: locate the
 * `.claude` dir, run the (LLM-backed) profile build, then persist via `save`.
 * Surfaces a `building` flag for the button's loading/disabled state and an
 * `error` string for the locate-failure case. Save failures bubble up; locate
 * returning null is the one handled, user-actionable miss.
 */
export function useRebuildProfile(save: (next: UserProfile) => Promise<UserProfile>): UseRebuildProfile {
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rebuild = useCallback(async () => {
    if (building) return;
    setError(null);
    setBuilding(true);
    try {
      const claudePath = await window.api.locateClaudeUser();
      if (claudePath === null) {
        setError(LOCATE_FAILED);
        return;
      }
      const built = await window.api.buildUserProfile(claudePath);
      await save(built);
    } finally {
      setBuilding(false);
    }
  }, [building, save]);

  return { building, error, rebuild };
}
