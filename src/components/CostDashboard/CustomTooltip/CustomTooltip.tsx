import type { TooltipContentProps } from 'recharts';

import { formatTokens } from '../utils';

export type CustomTooltipProps = TooltipContentProps;

export function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-surface-2 border border-border rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-fg-muted mb-1">{label}</p>
      {payload.map((p) => {
        const name = typeof p.name === 'string' ? p.name : String(p.name ?? '');
        const numericValue = typeof p.value === 'number' ? p.value : Number(p.value);
        const isCost = name.includes('$');
        return (
          <p key={name} style={{ color: p.color }}>
            {name}: {isCost ? `$${numericValue.toFixed(4)}` : formatTokens(numericValue)}
          </p>
        );
      })}
    </div>
  );
}
