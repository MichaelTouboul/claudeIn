import { create } from "zustand";

import type { ImproveRequest } from "@/lib/types";
import { ImproveStatus } from "@/lib/types";

/**
 * Self-Improve loop — notification state (I5).
 *
 * Tracks improvement requests the runner has driven to `merged` and which the
 * user has not yet acknowledged. This is app-global state: it is fed by a push
 * event stream, read by an independent subtree (the `Header` badge/popover, on
 * any page), and must survive subtree unmounts (navigating between pages must
 * not drop a pending "an improvement is ready" notification). Per `src/CLAUDE.md`
 * decision tree that lands it in a focused zustand store — not local state, not
 * context (context re-renders every consumer on each event and cannot survive a
 * Header unmount cleanly).
 *
 * Acknowledged ids are persisted to `localStorage` so a renderer reload (the
 * "Update" affordance) does not resurface an improvement the user already
 * actioned.
 */

/** localStorage key holding the JSON array of acknowledged request ids. */
export const ACKNOWLEDGED_STORAGE_KEY = "claudein.improve.acknowledged";

type ImproveState = {
  /** Tracked merged requests, keyed by id (latest payload wins). */
  requests: Record<string, ImproveRequest>;
  /** Ids the user has acknowledged (dismissed or updated). Persisted. */
  acknowledgedIds: Set<string>;
  /** Apply a single pushed request (only `merged` ones are kept). */
  ingest: (request: ImproveRequest) => void;
  /** Replace the tracked set from a full list (the initial `improve:list` seed). */
  seed: (requests: ImproveRequest[]) => void;
  /** Mark a request acknowledged and persist the id set. */
  acknowledge: (id: string) => void;
  /** Hydrate the acknowledged-id set from localStorage. */
  loadAcknowledged: () => void;
};

function readAcknowledged(): Set<string> {
  try {
    const raw = localStorage.getItem(ACKNOWLEDGED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is string => typeof v === "string"));
  } catch {
    return new Set();
  }
}

function writeAcknowledged(ids: Set<string>): void {
  try {
    localStorage.setItem(ACKNOWLEDGED_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // localStorage may be unavailable (private mode / quota); the in-memory set
    // still hides the notification for this session, so failure is non-fatal.
  }
}

// Only `merged` requests are notification-worthy. `pending` is in-flight and
// `failed` is surfaced elsewhere (not part of I5). One authoritative predicate.
function isNotifiable(status: ImproveStatus): boolean {
  return status === ImproveStatus.Merged;
}

export const useImproveStore = create<ImproveState>((set) => ({
  requests: {},
  acknowledgedIds: new Set(),

  ingest: (request) =>
    set((s) => {
      if (!isNotifiable(request.status)) return s;
      return { requests: { ...s.requests, [request.id]: request } };
    }),

  seed: (requests) =>
    set(() => {
      const next: Record<string, ImproveRequest> = {};
      for (const r of requests) {
        if (isNotifiable(r.status)) next[r.id] = r;
      }
      return { requests: next };
    }),

  acknowledge: (id) =>
    set((s) => {
      const acknowledgedIds = new Set(s.acknowledgedIds).add(id);
      writeAcknowledged(acknowledgedIds);
      return { acknowledgedIds };
    }),

  loadAcknowledged: () => set({ acknowledgedIds: readAcknowledged() }),
}));

/**
 * Pure derivation of the merged-but-unacknowledged requests, newest first.
 * Takes the raw slices so consumers can select them individually (stable
 * references) and memoize this — a zustand selector that built a fresh array on
 * every call would loop the store. Used by the Header notification component.
 */
export function unacknowledgedMerged(
  requests: Record<string, ImproveRequest>,
  acknowledgedIds: Set<string>,
): ImproveRequest[] {
  return Object.values(requests)
    .filter((r) => !acknowledgedIds.has(r.id))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Convenience whole-state selector (tests / non-render call sites). */
export function selectUnacknowledgedMerged(state: ImproveState): ImproveRequest[] {
  return unacknowledgedMerged(state.requests, state.acknowledgedIds);
}
