import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import {
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

export const SUBMIT_INTENT: LexicalCommand<void> = createCommand('SUBMIT_INTENT');

export type SubmitPluginProps = {
  /** Return true if Enter was consumed by the slash/mention menu (then do not submit). */
  onEnter: () => boolean;
  /** Return true if the key was consumed by an open menu (↑/↓/Esc navigation). */
  onNavKey: (key: string) => boolean;
};

export function SubmitPlugin({ onEnter, onNavKey }: SubmitPluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const navHandler = (key: string) => (event: KeyboardEvent | null) => {
      if (!onNavKey(key)) return false;
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
          // Tab confirms the highlighted suggestion — identical to Enter — but ONLY
          // while a slash/mention menu is open and consumes it. When no menu is open
          // `onEnter()` returns false, so we leave Tab's default focus behavior intact.
          if (!onEnter()) return false;
          event?.preventDefault();
          return true;
        },
        COMMAND_PRIORITY_HIGH
      ),
      editor.registerCommand<KeyboardEvent | null>(
        KEY_ARROW_DOWN_COMMAND,
        navHandler('ArrowDown'),
        COMMAND_PRIORITY_HIGH
      ),
      editor.registerCommand<KeyboardEvent | null>(
        KEY_ARROW_UP_COMMAND,
        navHandler('ArrowUp'),
        COMMAND_PRIORITY_HIGH
      ),
      editor.registerCommand<KeyboardEvent | null>(
        KEY_ESCAPE_COMMAND,
        navHandler('Escape'),
        COMMAND_PRIORITY_HIGH
      )
    );
  }, [editor, onEnter, onNavKey]);

  return null;
}
