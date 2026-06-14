import { type FormEvent,useState } from 'react';

import { Button } from '@/components/_ui/Button/Button';
import { Input } from '@/components/_ui/Input';

import type { ChatMessage } from '../types';

type ImproveChatProps = {
  messages: ChatMessage[];
  loading: boolean;
  onSend: (text: string) => void;
};

const roleStyle: Record<ChatMessage['role'], { align: string; bg: string }> = {
  user: { align: 'self-end', bg: 'var(--color-accent-dim)' },
  assistant: { align: 'self-start', bg: 'var(--color-surface-3)' },
};

/** Scoping chat: scrollable message list + a labelled input/send row. */
export function ImproveChat({ messages, loading, onSend }: ImproveChatProps) {
  const [draft, setDraft] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || loading) return;
    onSend(text);
    setDraft('');
  };

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
          messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded px-3 py-2 text-sm whitespace-pre-wrap ${roleStyle[m.role].align}`}
              style={{ background: roleStyle[m.role].bg, color: 'var(--color-text-primary)' }}
            >
              {m.text}
            </div>
          ))
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
        className="flex items-center gap-2 px-4 py-3 border-t"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <Input
          aria-label="Message"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={loading}
          placeholder="Type a message…"
          className="flex-1 bg-surface-3"
        />
        <Button type="submit" intent="outline" disabled={loading || draft.trim() === ''}>
          Send
        </Button>
      </form>
    </div>
  );
}
