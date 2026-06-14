import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { render } from '@testing-library/react';
import { KEY_ENTER_COMMAND, KEY_TAB_COMMAND, type LexicalEditor } from 'lexical';
import { describe, expect, it, vi } from 'vitest';

import { SubmitPlugin, type SubmitPluginProps } from '@/components/AgentChat/RichEditor/plugins/SubmitPlugin';

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

describe('SubmitPlugin — Tab confirms the highlighted suggestion', () => {
  it('Tab confirms the highlight via onEnter and prevents default when a menu is open', () => {
    const onEnter = vi.fn(() => true); // menu open + highlight present → consumed
    const onNavKey = vi.fn(() => false);
    const editor = renderPlugin({ onEnter, onNavKey });

    const event = makeTabEvent();
    const preventDefault = vi.spyOn(event, 'preventDefault');
    const consumed = editor.dispatchCommand(KEY_TAB_COMMAND, event);

    expect(onEnter).toHaveBeenCalledTimes(1);
    expect(consumed).toBe(true);
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it('Tab keeps its default behavior (no preventDefault) when no menu is open', () => {
    const onEnter = vi.fn(() => false); // no menu → not consumed
    const onNavKey = vi.fn(() => false);
    const editor = renderPlugin({ onEnter, onNavKey });

    const event = makeTabEvent();
    const preventDefault = vi.spyOn(event, 'preventDefault');
    const consumed = editor.dispatchCommand(KEY_TAB_COMMAND, event);

    expect(onEnter).toHaveBeenCalledTimes(1);
    expect(consumed).toBe(false);
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('Tab uses the same confirm handler (onEnter) that Enter does', () => {
    const onEnter = vi.fn(() => true);
    const onNavKey = vi.fn(() => false);
    const editor = renderPlugin({ onEnter, onNavKey });

    editor.dispatchCommand(KEY_ENTER_COMMAND, makeTabEvent());
    const afterEnter = onEnter.mock.calls.length;
    editor.dispatchCommand(KEY_TAB_COMMAND, makeTabEvent());

    // Both keys route through the very same onEnter confirm path.
    expect(onEnter.mock.calls.length).toBe(afterEnter + 1);
  });
});
