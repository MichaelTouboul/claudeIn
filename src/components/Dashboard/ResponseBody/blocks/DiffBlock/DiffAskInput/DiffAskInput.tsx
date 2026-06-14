import { Sparkles } from 'lucide-react';
import { type KeyboardEvent, useState } from 'react';

export type DiffAskInputProps = {
  /** Submit the typed question (Enter). */
  onSubmit: (question: string) => void;
  /** Cancel/close the input (Esc). */
  onCancel: () => void;
};

/**
 * The Cursor-style single-line prompt that opens directly under a diff line.
 * Enter submits a non-empty question; Esc cancels.
 */
export function DiffAskInput({ onSubmit, onCancel }: DiffAskInputProps) {
  const [question, setQuestion] = useState('');

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = question.trim();
      if (trimmed) onSubmit(trimmed);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5"
      style={{
        background: 'var(--color-surface-1)',
        borderTop: '1px solid var(--color-border-subtle)',
        borderBottom: '1px solid var(--color-border-subtle)',
      }}
    >
      <Sparkles size={13} style={{ color: 'var(--color-accent)' }} className="shrink-0" />
      <input
        type="text"
        autoFocus
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Ask Claude about this line…"
        aria-label="Ask about this line"
        className="flex-1 bg-transparent text-xs outline-none"
        style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' }}
      />
    </div>
  );
}
