import { Loader2, X } from 'lucide-react';

import { ResponseBody } from '@/components/ResponseBody/ResponseBody';

import { AskPhase } from '../useDiffAsk';

export type DiffAskPopoverProps = {
  /** Loading while the one-shot LLM runs, Answered once the markdown is back. */
  phase: typeof AskPhase.Loading | typeof AskPhase.Answered;
  /** The answer markdown (Answered phase). */
  answer: string;
  /** Dismiss the popover. */
  onDismiss: () => void;
};

/** Inline expansion under a diff line: a spinner while loading, then the markdown answer. */
export function DiffAskPopover({ phase, answer, onDismiss }: DiffAskPopoverProps) {
  return (
    <div
      className="relative px-3 py-2"
      style={{
        background: 'var(--color-surface-1)',
        borderTop: '1px solid var(--color-border-subtle)',
        borderBottom: '1px solid var(--color-border-subtle)',
      }}
    >
      <button
        type="button"
        onClick={onDismiss}
        title="Dismiss"
        aria-label="Dismiss answer"
        className="absolute right-2 top-2 rounded p-0.5"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <X size={13} />
      </button>
      {phase === AskPhase.Loading ? (
        <div
          className="flex items-center gap-2 text-xs"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <Loader2 size={13} className="animate-spin" />
          Asking Claude…
        </div>
      ) : (
        <div className="pr-5">
          <ResponseBody content={answer} />
        </div>
      )}
    </div>
  );
}
