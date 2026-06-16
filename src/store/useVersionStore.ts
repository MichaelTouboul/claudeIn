import { create } from "zustand";

/**
 * App-version notification state.
 *
 * The main process self-detects every `land.sh` bump by watching its own
 * `package.json` and broadcasts `version_changed`. This app-global store tracks
 * the version the renderer *booted with* (`running`), the newest version seen on
 * disk (`latest`), and the version the user last acknowledged. It is fed by a
 * push stream, read by an independent subtree (the Header badge/popover on any
 * page), and must survive subtree unmounts — so it lands in a focused zustand
 * store, mirroring `useImproveStore` (different domain, deliberately separate).
 *
 * The acknowledged version is persisted to `localStorage` so a renderer reload
 * (the "Reload to update" affordance) doesn't resurface a bump already actioned.
 */

/** localStorage key holding the last acknowledged version string. */
export const VERSION_ACK_STORAGE_KEY = "claudein.version.acknowledged";

type VersionState = {
  /** Version the renderer booted with (seeded from `system:appVersion`). */
  running: string;
  /** Newest version seen on disk via `version_changed`; null until one arrives. */
  latest: string | null;
  /** Last version the user acknowledged (reloaded/dismissed). Persisted. */
  acknowledged: string | null;
  /** Seed the running version once at startup. */
  seedRunning: (version: string) => void;
  /** Apply a pushed `version_changed`. */
  ingest: (version: string) => void;
  /** Mark a version acknowledged and persist it. */
  acknowledge: (version: string) => void;
  /** Hydrate the acknowledged version from localStorage. */
  loadAcknowledged: () => void;
};

function readAcknowledged(): string | null {
  try {
    return localStorage.getItem(VERSION_ACK_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeAcknowledged(version: string): void {
  try {
    localStorage.setItem(VERSION_ACK_STORAGE_KEY, version);
  } catch {
    // localStorage may be unavailable (private mode / quota); the in-memory
    // value still hides the notification this session, so failure is non-fatal.
  }
}

export const useVersionStore = create<VersionState>((set) => ({
  running: "",
  latest: null,
  acknowledged: null,

  seedRunning: (version) => set({ running: version }),
  ingest: (version) => set({ latest: version }),

  acknowledge: (version) =>
    set(() => {
      writeAcknowledged(version);
      return { acknowledged: version };
    }),

  loadAcknowledged: () => set({ acknowledged: readAcknowledged() }),
}));

/** The minimal slice `hasUpdate` reads — so callers needn't pass actions. */
export type VersionSnapshot = Pick<VersionState, "running" | "latest" | "acknowledged">;

/**
 * Pure predicate: a newer version is on disk that the user hasn't acknowledged
 * and that differs from what's running. The single source of truth for whether
 * the Header badge shows. Takes only the data slice so call sites (and tests)
 * can pass either `useVersionStore.getState()` or selected fields.
 */
export function hasUpdate({ running, latest, acknowledged }: VersionSnapshot): boolean {
  return latest !== null && latest !== running && latest !== acknowledged;
}
