import { create } from 'zustand';

/**
 * The pair of callbacks a chat composer publishes so out-of-tree surfaces (the
 * prompt-editor panel) can write back into it. `setInput` mirrors the composer's
 * own input setter (markdown string), `send` triggers the SAME send path the
 * composer's Send button uses. Both close over the live `AgentChat` instance.
 */
export type ComposerHandlers = {
  /** Overwrite the composer's input value (markdown). Does NOT send. */
  setInput: (markdown: string) => void;
  /** Fire the composer's send path (reads the just-set input + attachments). */
  send: () => void;
};

type ComposerBridgeState = {
  /** Registered handlers keyed by composerId (one per live chat instance). */
  handlers: Record<string, ComposerHandlers>;
  /** A composer publishes its handlers on mount; returns the unregister fn. */
  register: (composerId: string, handlers: ComposerHandlers) => () => void;
  /**
   * Write `markdown` into the composer (Save). No-op if the composer is gone
   * (its chat tab was closed) — the draft still lives in the panel payload.
   */
  save: (composerId: string, markdown: string) => void;
  /**
   * Write `markdown` into the composer then fire its send path (Send). Deferred
   * one tick so the input state lands before send reads it. No-op if the
   * composer is gone.
   */
  send: (composerId: string, markdown: string) => void;
};

export const useComposerBridgeStore = create<ComposerBridgeState>((set, get) => ({
  handlers: {},
  register: (composerId, handlers) => {
    set((s) => ({ handlers: { ...s.handlers, [composerId]: handlers } }));
    return () =>
      set((s) => {
        const next = { ...s.handlers };
        delete next[composerId];
        return { handlers: next };
      });
  },
  save: (composerId, markdown) => {
    get().handlers[composerId]?.setInput(markdown);
  },
  send: (composerId, markdown) => {
    const h = get().handlers[composerId];
    if (!h) return;
    h.setInput(markdown);
    // Defer so the composer's `input` state is committed before `send` reads it.
    setTimeout(() => h.send(), 0);
  },
}));
