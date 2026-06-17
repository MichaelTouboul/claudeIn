import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  createCommand,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  type LexicalCommand,
} from 'lexical';
import { useEffect } from 'react';

import { $isCaretOnFirstLine, $isCaretOnLastLine } from './caretLines';
import { $setEditorText } from './setEditorText';

export const SUBMIT_INTENT: LexicalCommand<void> = createCommand('SUBMIT_INTENT');

/** Caret-position context handed to the history on an unconsumed ↑/↓ press. */
export type HistoryNavContext = {
  atFirstLine: boolean;
  atLastLine: boolean;
  currentText: string;
};

export type SubmitPluginProps = {
  /** Return true if Enter was consumed by the slash/mention menu (then do not submit). */
  onEnter: () => boolean;
  /** Return true if Tab was consumed by an open menu (complete the text only, no submit). */
  onComplete: () => boolean;
  /** Return true if the key was consumed by an open menu (↑/↓/Esc navigation). */
  onNavKey: (key: string) => boolean;
  /** ↑/↓ with NO menu open: returns the prompt-history text to load into the editor,
   *  or null to let the arrow move the caret normally. Only invoked when the slash/
   *  mention menu did not already consume the key. */
  onHistoryNav: (key: 'ArrowUp' | 'ArrowDown', ctx: HistoryNavContext) => string | null;
};

export function SubmitPlugin({ onEnter, onComplete, onNavKey, onHistoryNav }: SubmitPluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const navHandler = (key: string) => (event: KeyboardEvent | null) => {
      if (!onNavKey(key)) return false;
      event?.preventDefault();
      return true;
    };
    // ↑/↓ history fallback: only reached when the menu did NOT consume the key. We
    // read the caret's edge position, ask the history for a replacement, and load it.
    const historyHandler = (key: 'ArrowUp' | 'ArrowDown') => (event: KeyboardEvent | null) => {
      if (onNavKey(key)) {
        event?.preventDefault();
        return true; // menu open → it owns the arrow, history stays out of it
      }
      const next = editor.getEditorState().read(() =>
        onHistoryNav(key, {
          atFirstLine: $isCaretOnFirstLine(),
          atLastLine: $isCaretOnLastLine(),
          currentText: $getRoot().getTextContent(),
        })
      );
      if (next === null) return false; // let Lexical move the caret normally
      editor.update(() => $setEditorText(next), { discrete: true });
      event?.preventDefault();
      return true;
    };
    return mergeRegister(
      editor.registerCommand<KeyboardEvent | null>(
        KEY_ENTER_COMMAND,
        (event) => {
          if (event?.shiftKey) {
            editor.update(() => {
              const selection = $getSelection();
              if ($isRangeSelection(selection)) selection.insertParagraph();
            });
            event.preventDefault();
            return true;
          }
          event?.preventDefault();
          if (onEnter()) return true;
          editor.dispatchCommand(SUBMIT_INTENT, undefined);
          return true;
        },
        COMMAND_PRIORITY_HIGH
      ),
      editor.registerCommand<KeyboardEvent | null>(
        KEY_TAB_COMMAND,
        (event) => {
          // Tab COMPLETES the highlighted suggestion into the input (text only) — it does
          // NOT launch/submit it (that's Enter's job). Only while a slash/mention menu is
          // open and consumes it; when no menu is open `onComplete()` returns false, so we
          // leave Tab's default focus behavior intact.
          if (!onComplete()) return false;
          event?.preventDefault();
          return true;
        },
        COMMAND_PRIORITY_HIGH
      ),
      editor.registerCommand<KeyboardEvent | null>(
        KEY_ARROW_DOWN_COMMAND,
        historyHandler('ArrowDown'),
        COMMAND_PRIORITY_HIGH
      ),
      editor.registerCommand<KeyboardEvent | null>(
        KEY_ARROW_UP_COMMAND,
        historyHandler('ArrowUp'),
        COMMAND_PRIORITY_HIGH
      ),
      editor.registerCommand<KeyboardEvent | null>(
        KEY_ESCAPE_COMMAND,
        navHandler('Escape'),
        COMMAND_PRIORITY_HIGH
      )
    );
  }, [editor, onEnter, onComplete, onNavKey, onHistoryNav]);

  return null;
}
