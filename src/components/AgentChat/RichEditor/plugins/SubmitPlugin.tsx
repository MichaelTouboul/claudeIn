import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  createCommand,
  KEY_ENTER_COMMAND,
  type LexicalCommand,
} from 'lexical';
import { useEffect } from 'react';

export const SUBMIT_INTENT: LexicalCommand<void> = createCommand('SUBMIT_INTENT');

export type SubmitPluginProps = {
  /** Return true if Enter was consumed by the slash popup (then do not submit). */
  onEnter: () => boolean;
};

export function SubmitPlugin({ onEnter }: SubmitPluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand<KeyboardEvent | null>(
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
    );
  }, [editor, onEnter]);

  return null;
}
