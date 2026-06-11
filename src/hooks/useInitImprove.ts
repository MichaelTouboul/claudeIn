import { useEffect } from "react";

import { useImproveStore } from "@/store/useImproveStore";

/**
 * Wire the Self-Improve notification (I5) on app start:
 * - hydrate acknowledged ids from localStorage (so a reload doesn't resurface),
 * - ask the main process to `watch` the inbox for changes,
 * - `list` once to seed any already-`merged` requests that landed while away,
 * - subscribe to the `improve_request_changed` push event for live updates.
 *
 * Idempotent cleanup unwatches and removes the listener on unmount.
 */
export function useInitImprove(): void {
  useEffect(() => {
    const store = useImproveStore.getState();
    store.loadAcknowledged();

    void window.api.watchImproveInbox();
    void window.api.listImproveRequests().then((requests) => {
      useImproveStore.getState().seed(requests);
    });

    const cleanup = window.api.onImproveRequestChanged((request) => {
      useImproveStore.getState().ingest(request);
    });

    return () => {
      cleanup();
      void window.api.unwatchImproveInbox();
    };
  }, []);
}
