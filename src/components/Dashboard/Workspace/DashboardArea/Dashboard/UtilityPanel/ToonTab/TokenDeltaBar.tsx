import { ArrowRight } from 'lucide-react';

import { Inline } from '@/components/_ui/Inline';

export type TokenDeltaBarProps = {
  jsonTokens: number;
  toonTokens: number;
  /** before - after; ≤ 0 when TOON is not smaller. */
  saved: number;
};

/** A compact JSON→TOON token comparison bar. Always shows the honest delta:
 *  green "saved" when TOON wins, a neutral "no saving" note otherwise. All counts
 *  are `≈` (the bundled tokenizer is not Claude's exact one). */
export function TokenDeltaBar({ jsonTokens, toonTokens, saved }: TokenDeltaBarProps) {
  const wins = saved > 0;
  return (
    <Inline gap={2} className="text-xs tabular-nums" justify="between">
      <Inline gap={1.5} className="font-mono">
        <span className="text-fg-muted">≈{jsonTokens.toLocaleString()} JSON</span>
        <ArrowRight size={12} className="text-fg-subtle" />
        <span className="text-fg">≈{toonTokens.toLocaleString()} TOON</span>
      </Inline>
      {wins ? (
        <span className="font-medium" style={{ color: 'var(--color-active)' }}>
          ≈{saved.toLocaleString()} tokens saved
        </span>
      ) : (
        <span style={{ color: 'var(--color-fg-muted)' }}>no saving — JSON kept</span>
      )}
    </Inline>
  );
}
