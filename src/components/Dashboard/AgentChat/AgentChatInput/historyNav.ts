import type { PromptHistory } from '@/hooks/usePromptHistory';

import type { HistoryNavContext } from '../RichEditor/plugins/SubmitPlugin';

/** Decide what an unconsumed ↑/↓ press should do for the prompt history.
 *
 *  Entry into the history is gated on the caret being at the relevant content edge
 *  (↑ on the first line, ↓ on the last line) — elsewhere the arrow just moves the
 *  caret. Once the user IS navigating the history (terminal-style), the arrows keep
 *  walking the history regardless of the caret line, until ArrowDown restores the
 *  draft below the newest entry. Returns the text to load, or null to let Lexical
 *  move the caret normally. */
export function resolveHistoryNav(
  history: PromptHistory,
  key: 'ArrowUp' | 'ArrowDown',
  ctx: HistoryNavContext
): string | null {
  const navigating = history.isNavigating();
  if (key === 'ArrowUp') {
    if (!navigating && !ctx.atFirstLine) return null;
    return history.navigatePrev(ctx.currentText);
  }
  // ArrowDown — only meaningful once we are already inside the history.
  if (!navigating) {
    return ctx.atLastLine ? history.navigateNext() : null;
  }
  return history.navigateNext();
}
