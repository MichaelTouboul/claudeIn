import { $createParagraphNode, $createTextNode, $getRoot } from 'lexical';

/** Replace the entire editor content with `text`, splitting on newlines into one
 *  paragraph per line, and drop the caret at the very end. MUST run inside an
 *  `editor.update` context. Mirrors the line model the history navigation relies on. */
export function $setEditorText(text: string): void {
  const root = $getRoot();
  root.clear();
  const lines = text.split('\n');
  const paragraphs = lines.map((line) => {
    const p = $createParagraphNode();
    if (line.length > 0) p.append($createTextNode(line));
    return p;
  });
  paragraphs.forEach((p) => root.append(p));
  root.selectEnd();
}
