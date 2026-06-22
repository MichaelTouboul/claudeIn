import { ImagePlus } from 'lucide-react';
import { type FormEvent, type KeyboardEvent, useState } from 'react';

import { Button } from '@/components/_ui/Button/Button';

import { parseRecap } from '../recap';
import { RecapCard } from '../RecapCard/RecapCard';
import { recapPreamble } from '../RecapCard/recapSplit';
import type { ChatMessage } from '../types';
import { AttachedImages } from './AttachedImages';
import { useImproveChatAttach } from './useImproveChatAttach';

type ImproveChatProps = {
  messages: ChatMessage[];
  loading: boolean;
  onSend: (text: string, images?: string[]) => void;
};

const roleStyle: Record<ChatMessage['role'], { align: string; bg: string }> = {
  user: { align: 'self-end', bg: 'var(--color-accent-dim)' },
  assistant: { align: 'self-start', bg: 'var(--color-surface-3)' },
};

/** Scoping chat: scrollable message list + a multiline composer with image attach. */
export function ImproveChat({ messages, loading, onSend }: ImproveChatProps) {
  const [draft, setDraft] = useState('');
  const attach = useImproveChatAttach();

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    const images = attach.attached.map((a) => a.path);
    if ((!text && images.length === 0) || loading) return;
    onSend(text, images.length > 0 ? images : undefined);
    setDraft('');
    attach.clear();
  };

  // Enter (no Shift) sends; Shift+Enter inserts a newline (default behavior).
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const canSend = !loading && (draft.trim() !== '' || attach.attached.length > 0);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div
        className="flex flex-col gap-2 px-4 py-3 overflow-y-auto"
        style={{ flex: 1, minHeight: '12rem' }}
      >
        {messages.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Describe what you'd like to improve. The assistant will ask a couple of questions,
            then propose a recap you can send to Claude.
          </p>
        ) : (
          messages.map((m) => {
            const recap = m.role === 'assistant' ? parseRecap(m.text) : null;
            const bubbleText = recap ? recapPreamble(m.text) : m.text;
            const hasImages = m.images !== undefined && m.images.length > 0;
            return (
              <div
                key={m.id}
                className={`flex flex-col max-w-[85%] ${roleStyle[m.role].align}`}
              >
                {bubbleText !== '' || hasImages ? (
                  <div
                    className="rounded px-3 py-2 text-sm whitespace-pre-wrap"
                    style={{ background: roleStyle[m.role].bg, color: 'var(--color-text-primary)' }}
                  >
                    {bubbleText}
                    {hasImages ? (
                      <span
                        className="flex items-center gap-1 mt-1 text-[11px]"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        <ImagePlus size={11} />
                        {m.images?.length} image{(m.images?.length ?? 0) > 1 ? 's' : ''} attached
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {recap ? <RecapCard recap={recap} /> : null}
              </div>
            );
          })
        )}
        {loading ? (
          <div
            className="self-start rounded px-3 py-2 text-sm"
            style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-muted)' }}
          >
            Thinking…
          </div>
        ) : null}
      </div>

      <form
        onSubmit={submit}
        className="flex flex-col border-t"
        style={{
          borderColor: attach.isDragging ? 'var(--color-accent)' : 'var(--color-border)',
        }}
        {...attach.dragHandlers}
      >
        <AttachedImages images={attach.attached} onRemove={attach.remove} />
        <div className="flex items-end gap-2 px-4 py-3">
          <Button
            type="button"
            intent="ghost"
            size="icon"
            onClick={() => void attach.pick()}
            disabled={loading}
            title="Attach image"
            aria-label="Attach image"
          >
            <ImagePlus size={16} />
          </Button>
          <textarea
            aria-label="Message"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={attach.onPaste}
            disabled={loading}
            rows={1}
            placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
            className="flex-1 resize-none rounded px-3 py-2 text-sm bg-surface-3 outline-none max-h-32"
            style={{
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-strong)',
              minHeight: '2.25rem',
            }}
          />
          <Button type="submit" intent="outline" disabled={!canSend}>
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}
