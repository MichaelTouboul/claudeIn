import { create } from "zustand";

type PinnedState = {
  // Optimistic overrides keyed by claudeSessionId (the on-disk `.jsonl` session
  // id). Mirrors the DB `pinned` flag so a pin/unpin toggle reflects instantly,
  // before the `listSessions` refetch agrees. Harmless once it agrees.
  overrides: Record<string, boolean>;
  setPinned: (claudeSessionId: string, pinned: boolean) => void;
};

export const usePinnedStore = create<PinnedState>((set) => ({
  overrides: {},

  setPinned: (claudeSessionId, pinned) =>
    set((s) => ({
      overrides: { ...s.overrides, [claudeSessionId]: pinned },
    })),
}));

// Effective pinned state for a session: the optimistic override wins when set,
// otherwise the DB-backed flag. Pass the override map (read via a selector) so
// callers stay selector-based and re-render only when their slice changes.
export function effectivePinned(
  overrides: Record<string, boolean>,
  claudeSessionId: string,
  dbPinned: boolean,
): boolean {
  return overrides[claudeSessionId] ?? dbPinned;
}
