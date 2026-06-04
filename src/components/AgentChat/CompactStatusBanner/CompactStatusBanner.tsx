import { Loader2, Sparkles, TriangleAlert } from 'lucide-react';

// Mirror of AgentChat's CompactStatus (the one-shot compact-on-resume turn).
// 'compacting' shows a spinner; 'done' a success note; 'failed' a non-blocking
// "unavailable" notice. Never rendered for `null`.
export type CompactStatusBannerProps = {
  status: 'compacting' | 'done' | 'failed';
};

const COPY: Record<CompactStatusBannerProps['status'], string> = {
  compacting: 'Compacting context…',
  done: 'Context compacted ✓',
  failed: 'Compaction unavailable — continuing as is',
};

/**
 * Thin inline banner above the chat input that surfaces the automatic
 * compact-on-resume `/compact` turn. It is purely informational — it never
 * locks the input; the user can keep typing while it reads "Compacting…".
 */
export function CompactStatusBanner({ status }: CompactStatusBannerProps) {
  const color = status === 'failed' ? 'var(--color-text-muted)' : 'var(--color-accent)';
  return (
    <div
      className="px-4 py-1.5 flex items-center gap-1.5 text-xs shrink-0 border-t"
      style={{ color, borderColor: 'var(--color-border-subtle)', background: 'var(--color-surface-1)', fontFamily: 'var(--font-sans)' }}
      role="status"
    >
      {status === 'compacting' ? <Loader2 size={12} className="animate-spin" /> : null}
      {status === 'done' ? <Sparkles size={12} /> : null}
      {status === 'failed' ? <TriangleAlert size={12} /> : null}
      {COPY[status]}
    </div>
  );
}
