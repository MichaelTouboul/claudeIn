import { Database } from 'lucide-react';

import { Tooltip } from '@/components/_ui/Tooltip';
import { formatTokens } from '@/components/Dashboard/Workspace/utils';

import { contextLevel, contextLevelColorVar } from '../statusBar';

export type ContextMeterProps = {
  /** Used-context percent (0–100). */
  percent: number;
  tokensIn: number;
  tokensOut: number;
};

/**
 * The context-usage read-out: a database icon, a mini progress bar colored by
 * severity (green < 60% / amber < 85% / red ≥ 85%), and the percent. The tooltip
 * shows used / total tokens (total back-derived from the percent).
 */
export function ContextMeter({ percent, tokensIn, tokensOut }: ContextMeterProps) {
  const used = tokensIn + tokensOut;
  const total = percent > 0 ? Math.round(used / (percent / 100)) : 0;
  const color = contextLevelColorVar(contextLevel(percent));
  const tip = total > 0 ? `Contexte utilisé — ${formatTokens(used)} / ${formatTokens(total)} tokens` : 'Contexte utilisé';

  return (
    <Tooltip label={tip}>
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-fg-subtle whitespace-nowrap">
        <Database size={13} aria-hidden="true" />
        <span
          className="overflow-hidden rounded-full"
          style={{ width: 46, height: 5, background: 'var(--color-surface-inset)' }}
          role="progressbar"
          aria-valuenow={Math.round(percent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Context usage"
        >
          <span
            className="block h-full rounded-full transition-[width] duration-500"
            style={{ width: `${Math.min(percent, 100)}%`, background: color }}
          />
        </span>
        <span className="font-mono text-fg-muted tabular-nums">{Math.round(percent)}%</span>
      </span>
    </Tooltip>
  );
}
