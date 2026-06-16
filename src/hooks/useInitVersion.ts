import { useEffect } from "react";

import { useVersionStore } from "@/store/useVersionStore";

/**
 * Wire the app-version notification on app start (mirrors `useInitImprove`):
 * - hydrate the acknowledged version from localStorage (so a reload doesn't
 *   resurface a bump already actioned),
 * - seed the running version from `system:appVersion`,
 * - ask the main process to watch its own `package.json` for bumps,
 * - subscribe to the `version_changed` push event and ingest each new version.
 *
 * Idempotent cleanup unwatches and removes the listener on unmount.
 */
export function useInitVersion(): void {
  useEffect(() => {
    const store = useVersionStore.getState();
    store.loadAcknowledged();

    void window.api.getAppVersion().then((version) => {
      useVersionStore.getState().seedRunning(version);
    });
    void window.api.watchAppVersion();

    const cleanup = window.api.onVersionChanged((version) => {
      useVersionStore.getState().ingest(version);
    });

    return () => {
      cleanup();
      void window.api.unwatchAppVersion();
    };
  }, []);
}
