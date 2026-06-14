import { create } from 'zustand';

import type { JsonAttachment } from '@/lib/types';

/**
 * Holds the JSON→TOON attachments pending in chat composers, keyed by id. Lives at
 * the app root because it is read by two independent subtrees — the composer
 * (`JsonChip`) and the right `UtilityPanel` (`ToonTab`) — and must survive the
 * panel unmounting while an attachment is still staged in the composer. Changes
 * often (every paste/toggle/edit) → zustand, not context.
 *
 * Selector-based usage only: `useToonStore((s) => s.attachments[id])`, etc.
 */
type ToonState = {
  /** All staged attachments across every composer, keyed by attachment id. */
  attachments: Record<string, JsonAttachment>;
  /** The attachment currently open for review/edit in the panel, or null. */
  editingId: string | null;
  /** Add (or replace) an attachment. */
  add: (attachment: JsonAttachment) => void;
  /** Remove an attachment by id; clears `editingId` if it pointed at it. */
  remove: (id: string) => void;
  /** Patch an attachment in place (no-op if it doesn't exist). */
  update: (id: string, patch: Partial<Omit<JsonAttachment, 'id' | 'composerId'>>) => void;
  /** Open (or close, with null) an attachment for editing in the panel. */
  setEditing: (id: string | null) => void;
  /** Drop every attachment belonging to a composer (called after send). */
  clearComposer: (composerId: string) => void;
};

export const useToonStore = create<ToonState>((set) => ({
  attachments: {},
  editingId: null,
  add: (attachment) =>
    set((s) => ({ attachments: { ...s.attachments, [attachment.id]: attachment } })),
  remove: (id) =>
    set((s) => {
      const next = { ...s.attachments };
      delete next[id];
      return { attachments: next, editingId: s.editingId === id ? null : s.editingId };
    }),
  update: (id, patch) =>
    set((s) => {
      const current = s.attachments[id];
      if (!current) return {};
      return { attachments: { ...s.attachments, [id]: { ...current, ...patch } } };
    }),
  setEditing: (id) => set({ editingId: id }),
  clearComposer: (composerId) =>
    set((s) => {
      const next: Record<string, JsonAttachment> = {};
      let editingCleared = false;
      for (const [id, att] of Object.entries(s.attachments)) {
        if (att.composerId === composerId) {
          if (s.editingId === id) editingCleared = true;
          continue;
        }
        next[id] = att;
      }
      return { attachments: next, editingId: editingCleared ? null : s.editingId };
    }),
}));

/** Selects every attachment staged in a given composer, in insertion order, from
 *  the attachments record. Takes the record (not the whole state) so React callers
 *  can `useToonStore((s) => s.attachments)` — a STABLE reference — then derive the
 *  slice in a `useMemo` (a selector returning this fresh array directly would loop).
 *  Also runs outside React (the send path via `getState().attachments`). */
export function byComposer(
  attachments: Record<string, JsonAttachment>,
  composerId: string,
): JsonAttachment[] {
  return Object.values(attachments).filter((a) => a.composerId === composerId);
}
