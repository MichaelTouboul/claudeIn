import { Send } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/_ui/Button';
import { useComposerBridgeStore } from '@/store/dashboard/useComposerBridgeStore';
import { type PanelTab, PanelTabKind, usePanelStore } from '@/store/dashboard/usePanelStore';

import { applyFormat, countWordsChars, type PromptFormat } from './markdownFormat';
import { PromptEditorToolbar } from './PromptEditorToolbar';

/**
 * The "Prompt editor (workspace)" panel body (design card #9, block 3). A
 * long-form markdown draft surface opened from a chat composer's maximize button:
 * a format toolbar, an editable body, and a footer with a live word/char count +
 * Save (write the draft back into the composer) and Send (write + fire
 * the composer's send, then close). The draft lives in the panel payload and is
 * patched in place so close/reopen preserves it. Composer write-back goes through
 * `useComposerBridgeStore`, keyed by the payload's `composerId`.
 */
export function PromptEditorTab({ tab }: { tab: PanelTab }) {
  const update = usePanelStore((s) => s.update);
  const close = usePanelStore((s) => s.close);
  const saveToComposer = useComposerBridgeStore((s) => s.save);
  const sendToComposer = useComposerBridgeStore((s) => s.send);
  const [armed, setArmed] = useState<PromptFormat | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const isPromptEditor = tab.kind === PanelTabKind.PromptEditor;
  const text = isPromptEditor ? tab.payload.text : '';
  const composerId = isPromptEditor ? tab.payload.composerId : '';
  const { words, chars } = useMemo(() => countWordsChars(text), [text]);

  const setText = useCallback(
    (next: string) => {
      update({ kind: PanelTabKind.PromptEditor, payload: { composerId, text: next } });
    },
    [update, composerId],
  );

  const handleFormat = useCallback(
    (format: PromptFormat) => {
      const el = textareaRef.current;
      const start = el?.selectionStart ?? text.length;
      const end = el?.selectionEnd ?? text.length;
      const res = applyFormat(format, text, start, end);
      setArmed(format);
      setText(res.text);
      // Restore the selection after the controlled re-render so the user keeps
      // typing inside the markers / on the prefixed line.
      requestAnimationFrame(() => {
        const node = textareaRef.current;
        if (!node) return;
        node.focus();
        node.setSelectionRange(res.selStart, res.selEnd);
      });
    },
    [text, setText],
  );

  // Minimal link affordance: wrap the selection (or insert a placeholder) as a
  // markdown link `[text](url)`. Not a full picker — flagged as a follow-up.
  const handleLink = useCallback(() => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const label = text.slice(start, end) || 'text';
    const next = `${text.slice(0, start)}[${label}](url)${text.slice(end)}`;
    setText(next);
  }, [text, setText]);

  const handleSave = useCallback(() => saveToComposer(composerId, text), [saveToComposer, composerId, text]);
  const handleSend = useCallback(() => {
    sendToComposer(composerId, text);
    close();
  }, [sendToComposer, composerId, text, close]);

  if (!isPromptEditor) return null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PromptEditorToolbar
        active={armed}
        onFormat={handleFormat}
        onLink={handleLink}
        onInsertAgent={() => setText(`${text}${text.endsWith('\n') || text === '' ? '' : '\n'}@`)}
      />
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        placeholder="Write or paste a long prompt…"
        className="min-h-0 flex-1 resize-none bg-transparent p-4 text-sm leading-relaxed outline-none"
        style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' }}
      />
      <div
        className="flex items-center gap-2.5 px-3.5 py-2.5 shrink-0"
        style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-0)' }}
      >
        <span className="text-[11.5px]" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
          {words} words · {chars} characters
        </span>
        <div className="flex-1" />
        <Button intent="ghost" size="sm" onClick={handleSave} disabled={text.trim() === ''}>
          Save
        </Button>
        <Button
          intent="primary"
          size="sm"
          rightIcon={<Send size={14} />}
          onClick={handleSend}
          disabled={text.trim() === ''}
        >
          Send
        </Button>
      </div>
    </div>
  );
}
