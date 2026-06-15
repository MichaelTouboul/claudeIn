import { useCallback, useEffect, useState } from "react";

import type { HookEntry } from "@/lib/types";

export type UseCustomizeHooks = {
  hooks: HookEntry[];
  loading: boolean;
  /** Toggle a hook on/off; persists via `setHookEnabled` and adopts its result. */
  setEnabled: (hookId: string, enabled: boolean) => Promise<void>;
};

/**
 * Reads the normalized hooks list for the active repo scope and exposes a
 * reversible enable/disable toggle. The toggle is optimistic — it flips the row
 * immediately, then reconciles with the authoritative list `setHookEnabled`
 * returns (so a rejected/managed toggle snaps back).
 */
export function useCustomizeHooks(repoScope: string | null): UseCustomizeHooks {
  const [hooks, setHooks] = useState<HookEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void window.api.getHooks(repoScope ?? undefined).then((list) => {
      if (cancelled) return;
      setHooks(list);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [repoScope]);

  const setEnabled = useCallback(
    async (hookId: string, enabled: boolean) => {
      setHooks((list) => list.map((h) => (h.id === hookId ? { ...h, enabled } : h)));
      const updated = await window.api.setHookEnabled(hookId, enabled, repoScope ?? undefined);
      setHooks(updated);
    },
    [repoScope],
  );

  return { hooks, loading, setEnabled };
}
