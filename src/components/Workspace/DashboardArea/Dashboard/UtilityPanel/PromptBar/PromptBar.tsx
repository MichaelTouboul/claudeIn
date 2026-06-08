import { Loader2, Sparkles } from 'lucide-react';
import { type FormEvent, type KeyboardEvent,useEffect,useState } from 'react';

import { Button } from '@/components/_ui/Button';
import type { PanelTabKind } from '@/store/usePanelStore';

type PromptBarProps = {
  /** The tab kind — forwarded to the transform so the model knows the output contract. */
  kind: PanelTabKind;
  /** The tab's CURRENT content (read at submit time by the parent), sent as the source. */
  content: string;
  /**
   * Apply the transform result in place. Each tab supplies its own logic (table →
   * re-parse markdown into rows/cols; code/text → replace the payload). Only called
   * with a non-empty result, so a failed transform leaves the tab untouched.
   */
  apply: (result: string) => void;
  /**
   * Notified whenever the in-flight state flips. The table tab uses it to lock its
   * editable grid while a transform runs, so a mid-flight cell edit can't be
   * silently overwritten when the (stale) result lands. Optional: code/text tabs
   * are read-only and don't need it.
   */
  onRunningChange?: (isRunning: boolean) => void;
};

/**
 * Shared one-shot LLM prompt pinned at the bottom of every panel tab — the ONLY
 * place the panel invokes a model. Submitting runs `window.api.transform` (a
 * fresh headless `claude --print`, isolated from the chat) and hands the result
 * to `apply`. Esc or an empty field cancels.
 */
export function PromptBar({ kind, content, apply, onRunningChange }: PromptBarProps) {
  const [instruction, setInstruction] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  // Surface the in-flight state to the parent so it can lock interactive content.
  useEffect(() => {
    onRunningChange?.(isRunning);
  }, [isRunning, onRunningChange]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = instruction.trim();
    if (!trimmed || isRunning) return;

    setIsRunning(true);
    try {
      // A rejected IPC call (serialisation error, an unexpected throw in the
      // main-process handler, …) collapses to '' — same silent-failure contract
      // as transform.service, so it never escapes as an unhandled rejection.
      const result = await window.api
        .transform({ kind, instruction: trimmed, content })
        .catch(() => '');
      if (result) {
        apply(result);
        setInstruction('');
      }
    } finally {
      setIsRunning(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') setInstruction('');
  };

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-2 px-3 py-2 shrink-0"
      style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}
    >
      <Sparkles size={14} style={{ color: 'var(--color-accent)' }} className="shrink-0" />
      <input
        type="text"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={isRunning}
        placeholder="Ask to transform this (e.g. add a total column)…"
        aria-label="Transform instruction"
        className="flex-1 bg-transparent text-sm outline-none disabled:opacity-60"
        style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' }}
      />
      <Button
        type="submit"
        intent="primary"
        size="sm"
        disabled={isRunning || instruction.trim().length === 0}
      >
        {isRunning ? <Loader2 size={13} className="animate-spin" /> : 'Run'}
      </Button>
    </form>
  );
}
