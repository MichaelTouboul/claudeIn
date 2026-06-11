import { useEffect } from "react";

import { type AppPage, bootPageFor, useAppStore } from "@/store/useAppStore";

/**
 * One-shot boot decision: read the persisted user profile and pick the initial
 * page (Home if onboarding is done, else Onboarding). Runs only while
 * `currentPage` is still undecided (null), so it never overrides later
 * `navigate` calls. The router shows a loader until this resolves.
 *
 * Returns the current page (null = still deciding).
 */
export function useBootPage(): AppPage | null {
  const currentPage = useAppStore((s) => s.currentPage);
  const navigate = useAppStore((s) => s.navigate);

  useEffect(() => {
    if (currentPage !== null) return;
    let active = true;
    void window.api.getUserProfile().then((profile) => {
      if (!active) return;
      navigate(bootPageFor(profile));
    });
    return () => {
      active = false;
    };
  }, [currentPage, navigate]);

  return currentPage;
}
