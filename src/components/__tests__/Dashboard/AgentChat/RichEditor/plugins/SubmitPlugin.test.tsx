import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { render } from '@testing-library/react';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_TAB_COMMAND,
  type LexicalEditor,
} from 'lexical';
import { describe, expect, it, vi } from 'vitest';

import { SubmitPlugin, type SubmitPluginProps } from '@/components/Dashboard/AgentChat/RichEditor/plugins/SubmitPlugin';

/** Captures the live editor instance so a test can dispatch raw key commands at it,
 *  exactly as the browser would when the user presses a key in the editor. */
function CaptureEditor({ onReady }: { onReady: (editor: LexicalEditor) => void }) {
  const [editor] = useLexicalComposerContext();
  onReady(editor);
  return null;
}

function renderPlugin(props: SubmitPluginProps) {
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
      <SubmitPlugin {...props} />
      <CaptureEditor onReady={(e) => (editor = e)} />
    </LexicalComposer>
  );
  if (!editor) throw new Error('editor not ready');
  return editor as LexicalEditor;
}

function makeTabEvent(): KeyboardEvent {
  return new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
}

describe('SubmitPlugin — Tab completes the highlighted suggestion (no submit)', () => {
  it('Tab completes via onComplete (not onEnter) and prevents default when a menu is open', () => {
    const onEnter = vi.fn(() => true);
    const onComplete = vi.fn(() => true); // menu open + highlight present → consumed
    const onNavKey = vi.fn(() => false);
    const editor = renderPlugin({ onEnter, onComplete, onNavKey, onHistoryNav: () => null });

    const event = makeTabEvent();
    const preventDefault = vi.spyOn(event, 'preventDefault');
    const consumed = editor.dispatchCommand(KEY_TAB_COMMAND, event);

    expect(onComplete).toHaveBeenCalledTimes(1);
    // Tab must NOT route through the Enter (select + submit/launch) path.
    expect(onEnter).not.toHaveBeenCalled();
    expect(consumed).toBe(true);
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it('Tab keeps its default behavior (no preventDefault) when no menu is open', () => {
    const onEnter = vi.fn(() => false);
    const onComplete = vi.fn(() => false); // no menu → not consumed
    const onNavKey = vi.fn(() => false);
    const editor = renderPlugin({ onEnter, onComplete, onNavKey, onHistoryNav: () => null });

    const event = makeTabEvent();
    const preventDefault = vi.spyOn(event, 'preventDefault');
    const consumed = editor.dispatchCommand(KEY_TAB_COMMAND, event);

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(consumed).toBe(false);
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('Tab and Enter use distinct handlers — Tab completes, Enter confirms', () => {
    const onEnter = vi.fn(() => true);
    const onComplete = vi.fn(() => true);
    const onNavKey = vi.fn(() => false);
    const editor = renderPlugin({ onEnter, onComplete, onNavKey, onHistoryNav: () => null });

    editor.dispatchCommand(KEY_ENTER_COMMAND, makeTabEvent());
    expect(onEnter).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();

    editor.dispatchCommand(KEY_TAB_COMMAND, makeTabEvent());
    expect(onComplete).toHaveBeenCalledTimes(1);
    // Enter was not called again by the Tab press.
    expect(onEnter).toHaveBeenCalledTimes(1);
  });
});

/** Seed the editor with N paragraphs and place the caret at the end of paragraph `at`. */
function seedLines(editor: LexicalEditor, lines: string[], at: number): void {
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
      paragraphs[at].getFirstChild()?.selectEnd();
    },
    { discrete: true }
  );
}

function makeArrowEvent(key: 'ArrowUp' | 'ArrowDown'): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, cancelable: true });
}

function editorText(editor: LexicalEditor): string {
  return editor.getEditorState().read(() => $getRoot().getTextContent());
}

describe('SubmitPlugin — prompt-history navigation (arrows at content edges)', () => {
  const noMenu = { onEnter: () => false, onComplete: () => false, onNavKey: () => false };

  it('an open menu owns the arrows — history is never consulted', () => {
    const onNavKey = vi.fn(() => true); // menu open, consumes the arrow
    const onHistoryNav = vi.fn(() => 'should-not-appear');
    const editor = renderPlugin({ ...noMenu, onNavKey, onHistoryNav });
    seedLines(editor, ['line one'], 0);

    const consumed = editor.dispatchCommand(KEY_ARROW_UP_COMMAND, makeArrowEvent('ArrowUp'));

    expect(consumed).toBe(true);
    expect(onNavKey).toHaveBeenCalledWith('ArrowUp');
    expect(onHistoryNav).not.toHaveBeenCalled();
    expect(editorText(editor)).toBe('line one');
  });

  it('ArrowUp on the first line: replaces the content with the history entry', () => {
    const onHistoryNav = vi.fn(() => 'previous prompt');
    const editor = renderPlugin({ ...noMenu, onHistoryNav });
    seedLines(editor, ['draft'], 0);

    const event = makeArrowEvent('ArrowUp');
    const preventDefault = vi.spyOn(event, 'preventDefault');
    const consumed = editor.dispatchCommand(KEY_ARROW_UP_COMMAND, event);

    expect(onHistoryNav).toHaveBeenCalledWith('ArrowUp', {
      atFirstLine: true,
      atLastLine: true,
      currentText: 'draft',
    });
    expect(consumed).toBe(true);
    expect(preventDefault).toHaveBeenCalled();
    expect(editorText(editor)).toBe('previous prompt');
  });

  it('ArrowDown on the last line restores the draft (history returns the draft)', () => {
    const onHistoryNav = vi.fn(() => 'my draft');
    const editor = renderPlugin({ ...noMenu, onHistoryNav });
    seedLines(editor, ['p1'], 0);

    const consumed = editor.dispatchCommand(KEY_ARROW_DOWN_COMMAND, makeArrowEvent('ArrowDown'));

    expect(onHistoryNav).toHaveBeenCalledWith('ArrowDown', {
      atFirstLine: true,
      atLastLine: true,
      currentText: 'p1',
    });
    expect(consumed).toBe(true);
    expect(editorText(editor)).toBe('my draft');
  });

  it('multi-line, caret NOT on the edge line: arrow moves the caret, history untouched', () => {
    const onHistoryNav = vi.fn(() => null); // history declines (not at a usable edge)
    const editor = renderPlugin({ ...noMenu, onHistoryNav });
    seedLines(editor, ['top', 'middle', 'bottom'], 1); // caret in the middle line

    const consumed = editor.dispatchCommand(KEY_ARROW_UP_COMMAND, makeArrowEvent('ArrowUp'));

    // Boundary flags reflect the real caret position…
    expect(onHistoryNav).toHaveBeenCalledWith('ArrowUp', {
      atFirstLine: false,
      atLastLine: false,
      currentText: 'top\n\nmiddle\n\nbottom',
    });
    // …and because history returned null, the editor is left for Lexical to move the caret.
    expect(consumed).toBe(false);
    expect(editorText(editor)).toBe('top\n\nmiddle\n\nbottom');
  });

  it('history returns null on a boundary line: arrow falls through (no edit)', () => {
    const onHistoryNav = vi.fn(() => null);
    const editor = renderPlugin({ ...noMenu, onHistoryNav });
    seedLines(editor, ['only'], 0);

    const consumed = editor.dispatchCommand(KEY_ARROW_UP_COMMAND, makeArrowEvent('ArrowUp'));

    expect(onHistoryNav).toHaveBeenCalledTimes(1);
    expect(consumed).toBe(false);
    expect(editorText(editor)).toBe('only');
  });
});
