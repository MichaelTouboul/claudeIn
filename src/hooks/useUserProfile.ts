import { useCallback, useEffect, useState } from "react";

import type { UserProfile } from "@/types/user.types";

export type UseUserProfile = {
  /** The persisted profile, or null on first run / before load resolves. */
  profile: UserProfile | null;
  loading: boolean;
  /** Re-read the profile from the back. */
  refresh: () => Promise<void>;
  /** Persist a profile; the returned value becomes the new local profile. */
  save: (next: UserProfile) => Promise<UserProfile>;
};

/** Read/save the singleton user profile (Home greeting + UserProfileView). */
export function useUserProfile(): UseUserProfile {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await window.api.getUserProfile();
    setProfile(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(async (next: UserProfile) => {
    const saved = await window.api.saveUserProfile(next);
    setProfile(saved);
    return saved;
  }, []);

  return { profile, loading, refresh, save };
}
