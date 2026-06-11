import { create } from 'zustand';

import type { ImproveContextTarget } from '@/types/improve.types';

/**
 * Self-Improve loop — open-modal state (I3).
 *
 * Owns ONLY whether the "Improve this…" modal is open and the component target
 * captured at the moment it was triggered. The modal UI + scoping chat are I4;
 * this store is the trigger surface both entry points write to:
 *   • the right-click "Improve this…" native context-menu item, and
 *   • the `/improve` (alias `/feature-request`) prompt command.
 *
 * App-global by the `src/CLAUDE.md` decision tree: it is written by independent
 * subtrees (a global context-menu listener mounted at the app root AND the chat
 * input), changes on user action, and must survive subtree unmounts — so a
 * focused, selector-based zustand store, not local state or context.
 */

type ImproveModalState = {
  /** Whether the improve modal (rendered in I4) is open. */
  open: boolean;
  /** The component context captured when the modal was opened, or null for a
   *  general request (no specific component). */
  target: ImproveContextTarget | null;
  /** Open the modal, capturing the resolved target (or null for general). */
  openImprove: (target: ImproveContextTarget | null) => void;
  /** Close the modal and clear the captured target. */
  closeImprove: () => void;
};

export const useImproveModalStore = create<ImproveModalState>((set) => ({
  open: false,
  target: null,
  openImprove: (target) => set({ open: true, target }),
  closeImprove: () => set({ open: false, target: null }),
}));
