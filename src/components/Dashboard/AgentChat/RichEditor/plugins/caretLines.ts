import { $getSelection, $isRangeSelection, type LexicalNode } from 'lexical';

/** Lexical models each visual line of the chat input as its own top-level block
 *  (Shift+Enter calls `insertParagraph`). "First line" / "last line" therefore map
 *  to the caret's top-level block being the first / last child of the root. A
 *  single-block input is simultaneously the first and the last line.
 *
 *  Both functions MUST be called inside an `editor.read`/`editor.update` context. */

function $caretTopLevel(): LexicalNode | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return null;
  return selection.anchor.getNode().getTopLevelElement();
}

/** True when the caret sits on the first line (top-level block) of the editor. */
export function $isCaretOnFirstLine(): boolean {
  const top = $caretTopLevel();
  if (!top) return false;
  return top.getPreviousSibling() === null;
}

/** True when the caret sits on the last line (top-level block) of the editor. */
export function $isCaretOnLastLine(): boolean {
  const top = $caretTopLevel();
  if (!top) return false;
  return top.getNextSibling() === null;
}
