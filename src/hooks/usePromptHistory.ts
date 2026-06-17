import { useRef } from 'react';

/** Terminal-style, session-scoped prompt history for the chat editor.
 *
 *  Everything is held in a `useRef` — the entries live only as long as this editor
 *  instance (the current app session); there is no disk persistence, so a restart
 *  starts the history empty. ArrowUp rewinds toward older prompts, ArrowDown walks
 *  back toward newer ones and finally restores the draft the user was typing when
 *  they entered the history. */
export type PromptHistory = {
  /** Append a freshly submitted prompt as the newest entry and reset navigation. */
  record: (prompt: string) => void;
  /** ArrowUp at the first line: returns the older entry to display, or null when
   *  there is nothing older (empty history / already at the oldest entry). */
  navigatePrev: (currentText: string) => string | null;
  /** ArrowDown at the last line: returns the newer entry, then the saved draft once
   *  we pass the newest entry; null when not currently navigating. */
  navigateNext: () => string | null;
  /** True while the cursor sits inside the history (not on the live draft). */
  isNavigating: () => boolean;
};

type HistoryState = {
  /** Submitted prompts, oldest first, newest last. */
  entries: string[];
  /** Index into `entries` while navigating, or null when sitting on the draft. */
  cursor: number | null;
  /** The in-progress text saved when the user entered the history. */
  draft: string;
};

export function usePromptHistory(): PromptHistory {
  const stateRef = useRef<HistoryState>({ entries: [], cursor: null, draft: '' });

  const record = (prompt: string): void => {
    const state = stateRef.current;
    state.entries.push(prompt);
    state.cursor = null;
    state.draft = '';
  };

  const navigatePrev = (currentText: string): string | null => {
    const state = stateRef.current;
    if (state.entries.length === 0) return null;

    if (state.cursor === null) {
      // Entering the history: remember the live draft, jump to the newest entry.
      state.draft = currentText;
      state.cursor = state.entries.length - 1;
      return state.entries[state.cursor];
    }
    if (state.cursor === 0) return null; // already at the oldest entry
    state.cursor -= 1;
    return state.entries[state.cursor];
  };

  const navigateNext = (): string | null => {
    const state = stateRef.current;
    if (state.cursor === null) return null; // not navigating — leave ArrowDown alone

    if (state.cursor >= state.entries.length - 1) {
      // Stepping below the newest entry restores the saved draft and exits history.
      const draft = state.draft;
      state.cursor = null;
      state.draft = '';
      return draft;
    }
    state.cursor += 1;
    return state.entries[state.cursor];
  };

  const isNavigating = (): boolean => stateRef.current.cursor !== null;

  return { record, navigatePrev, navigateNext, isNavigating };
}
