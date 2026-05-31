import { $convertToMarkdownString } from '@lexical/markdown';
import { $getRoot, type LexicalEditor } from 'lexical';

import { CHAT_TRANSFORMERS } from './markdownTransformers';

/** Serialize the editor's current state to markdown using the shared subset.
 *  Falls back to plain text if serialization throws (never produce undefined). */
export function editorToMarkdown(editor: LexicalEditor): string {
  return editor.getEditorState().read(() => {
    try {
      return $convertToMarkdownString(CHAT_TRANSFORMERS);
    } catch {
      return $getRoot().getTextContent();
    }
  });
}

/** Plain-mode slash detection: returns the query token for a bare `/...`, else null. */
export function matchSlashQuery(text: string): string | null {
  const match = /^\/(\w*)$/.exec(text.trim());
  return match ? match[1] : null;
}
