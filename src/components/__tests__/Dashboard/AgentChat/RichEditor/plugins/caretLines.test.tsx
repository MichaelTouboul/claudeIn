import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { render } from '@testing-library/react';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $setSelection,
  type LexicalEditor,
} from 'lexical';
import { describe, expect, it } from 'vitest';

import { $isCaretOnFirstLine, $isCaretOnLastLine } from '@/components/Dashboard/AgentChat/RichEditor/plugins/caretLines';

function CaptureEditor({ onReady }: { onReady: (editor: LexicalEditor) => void }) {
  const [editor] = useLexicalComposerContext();
  onReady(editor);
  return null;
}

function makeEditor(): LexicalEditor {
  let editor: LexicalEditor | null = null;
  render(
    <LexicalComposer
      initialConfig={{
        namespace: 'test',
        onError: (e: Error) => {
          throw e;
        },
        theme: {},
      }}
    >
      <CaptureEditor onReady={(e) => (editor = e)} />
    </LexicalComposer>
  );
  if (!editor) throw new Error('editor not ready');
  return editor as LexicalEditor;
}

/** Build N paragraphs of text and place the caret at the END of paragraph `at`. */
function seed(editor: LexicalEditor, lines: string[], at: number): void {
  editor.update(
    () => {
      const root = $getRoot();
      root.clear();
      const paragraphs = lines.map((line) => {
        const p = $createParagraphNode();
        p.append($createTextNode(line));
        return p;
      });
      paragraphs.forEach((p) => root.append(p));
      const node = paragraphs[at].getFirstChild();
      if (node) node.selectEnd();
    },
    { discrete: true }
  );
}

function read<T>(editor: LexicalEditor, fn: () => T): T {
  return editor.getEditorState().read(fn);
}

describe('caretLines — first/last line detection', () => {
  it('single line: caret is on both the first and last line', () => {
    const editor = makeEditor();
    seed(editor, ['only line'], 0);
    expect(read(editor, $isCaretOnFirstLine)).toBe(true);
    expect(read(editor, $isCaretOnLastLine)).toBe(true);
  });

  it('caret on the first of three paragraphs: first=true, last=false', () => {
    const editor = makeEditor();
    seed(editor, ['top', 'middle', 'bottom'], 0);
    expect(read(editor, $isCaretOnFirstLine)).toBe(true);
    expect(read(editor, $isCaretOnLastLine)).toBe(false);
  });

  it('caret in the middle paragraph: neither first nor last', () => {
    const editor = makeEditor();
    seed(editor, ['top', 'middle', 'bottom'], 1);
    expect(read(editor, $isCaretOnFirstLine)).toBe(false);
    expect(read(editor, $isCaretOnLastLine)).toBe(false);
  });

  it('caret on the last paragraph: last=true, first=false', () => {
    const editor = makeEditor();
    seed(editor, ['top', 'middle', 'bottom'], 2);
    expect(read(editor, $isCaretOnFirstLine)).toBe(false);
    expect(read(editor, $isCaretOnLastLine)).toBe(true);
  });

  it('no range selection: returns false (never claims a boundary)', () => {
    const editor = makeEditor();
    seed(editor, ['top', 'bottom'], 0);
    editor.update(() => $setSelection(null), { discrete: true });
    expect(read(editor, $isCaretOnFirstLine)).toBe(false);
    expect(read(editor, $isCaretOnLastLine)).toBe(false);
  });
});
