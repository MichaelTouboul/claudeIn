import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { render } from '@testing-library/react';
import { type LexicalEditor, PASTE_COMMAND } from 'lexical';
import { describe, expect, it, vi } from 'vitest';

import { PastePlugin, type PastePluginProps } from '@/components/Dashboard/AgentChat/RichEditor/plugins/PastePlugin';

function CaptureEditor({ onReady }: { onReady: (editor: LexicalEditor) => void }) {
  const [editor] = useLexicalComposerContext();
  onReady(editor);
  return null;
}

function renderPlugin(props: PastePluginProps) {
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
      <PastePlugin {...props} />
      <CaptureEditor onReady={(e) => (editor = e)} />
    </LexicalComposer>
  );
  if (!editor) throw new Error('editor not ready');
  return editor as LexicalEditor;
}

function makePasteEvent(text: string): ClipboardEvent {
  const event = new Event('paste', { cancelable: true }) as ClipboardEvent;
  Object.defineProperty(event, 'clipboardData', {
    value: { getData: (type: string) => (type === 'text/plain' ? text : '') },
  });
  return event;
}

describe('PastePlugin — intercepts plain-text pastes', () => {
  it('consumes the paste and prevents default when onPasteText claims it', () => {
    const onPasteText = vi.fn(() => true);
    const editor = renderPlugin({ onPasteText });

    const event = makePasteEvent('[{"id":1}]');
    const preventDefault = vi.spyOn(event, 'preventDefault');
    const consumed = editor.dispatchCommand(PASTE_COMMAND, event);

    expect(onPasteText).toHaveBeenCalledWith('[{"id":1}]');
    expect(consumed).toBe(true);
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it('lets the paste proceed (no preventDefault) when onPasteText declines', () => {
    const onPasteText = vi.fn(() => false);
    const editor = renderPlugin({ onPasteText });

    const event = makePasteEvent('plain prose');
    const preventDefault = vi.spyOn(event, 'preventDefault');
    const consumed = editor.dispatchCommand(PASTE_COMMAND, event);

    expect(onPasteText).toHaveBeenCalledWith('plain prose');
    expect(consumed).toBe(false);
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('ignores a paste with no plain-text payload', () => {
    const onPasteText = vi.fn(() => true);
    const editor = renderPlugin({ onPasteText });

    const consumed = editor.dispatchCommand(PASTE_COMMAND, makePasteEvent(''));

    expect(onPasteText).not.toHaveBeenCalled();
    expect(consumed).toBe(false);
  });
});
