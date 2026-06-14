import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { COMMAND_PRIORITY_HIGH, PASTE_COMMAND } from 'lexical';
import { useEffect } from 'react';

export type PastePluginProps = {
  /** Intercepts a plain-text paste BEFORE it is inserted. Returning `true` claims
   *  the paste — Lexical's default insert is prevented (used for substantial-JSON
   *  paste → TOON attachment). Returning `false`/undefined lets the paste proceed. */
  onPasteText?: (text: string) => boolean;
};

/** Intercepts plain-text pastes and offers them to `onPasteText`. When that claims
 *  the paste (returns true) we consume the PASTE_COMMAND so Lexical never inserts
 *  the raw text. Registered at HIGH priority so it runs before the default paste. */
export function PastePlugin({ onPasteText }: PastePluginProps) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (!onPasteText) return;
    return editor.registerCommand(
      PASTE_COMMAND,
      (event: ClipboardEvent) => {
        const text = event.clipboardData?.getData('text/plain');
        if (!text) return false;
        if (!onPasteText(text)) return false;
        event.preventDefault();
        return true;
      },
      COMMAND_PRIORITY_HIGH
    );
  }, [editor, onPasteText]);
  return null;
}
