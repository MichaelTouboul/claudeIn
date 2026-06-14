import { useEffect } from 'react';

import { elementToComponent } from '@/lib/utils';
import { useImproveModalStore } from '@/store/useImproveModalStore';

/**
 * Self-Improve loop — right-click "Improve this…" entry point (I3).
 *
 * Mounted once at the app root. Owns the renderer half of the NATIVE context
 * menu: on any right-click it resolves the clicked element to its React
 * component + source (`elementToComponent`, via the dev-only `data-component` /
 * `data-source` attributes), prevents the browser's default menu, and asks the
 * main process to pop an Electron `Menu` (standard editing roles + a dev-only
 * "Improve this…" item) — `electron/services/context-menu.service.ts`.
 *
 * When the user picks "Improve this…", main sends the captured target back; we
 * open the modal store with it. A null resolution (production, or an
 * un-instrumented subtree) still opens a general improve (`target: null`).
 *
 * The "Improve this…" item is gated to dev in main via the `isDev` flag we send
 * (`import.meta.env.DEV`) — the source attributes only exist in dev builds.
 */
export function useImproveContextMenu(): void {
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      const resolved = elementToComponent(e.target as Element | null);
      // Take over the native browser menu; the Electron menu replaces it.
      e.preventDefault();
      window.api.openContextMenu({ target: resolved, isDev: import.meta.env.DEV });
    };
    document.addEventListener('contextmenu', onContextMenu);
    return () => document.removeEventListener('contextmenu', onContextMenu);
  }, []);

  useEffect(() => {
    const off = window.api.onImproveContextMenuSelected((target) => {
      useImproveModalStore.getState().openImprove(target);
    });
    return off;
  }, []);
}
