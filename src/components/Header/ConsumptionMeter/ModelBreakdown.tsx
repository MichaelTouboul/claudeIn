import { formatTokens } from '@/lib/formatTokens';
import { useBudgetStore } from '@/store/useBudgetStore';
import type { CostsByModel } from '@/types/costs.types';

import { formatCost, sortByCostDesc } from './utils';

export type ModelBreakdownProps = {
  rows: CostsByModel[];
};

export function ModelBreakdown({ rows }: ModelBreakdownProps) {
  const dailyBudget = useBudgetStore((s) => s.dailyBudget);
  const setDailyBudget = useBudgetStore((s) => s.setDailyBudget);
  const sorted = sortByCostDesc(rows);

  return (
    <div className="min-w-56 p-2" style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
      <div className="px-1 pb-1.5 text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
        Today
      </div>

      {sorted.length > 0 ? (
        <ul className="flex flex-col gap-0.5">
          {sorted.map((row) => (
            <li
              key={row.model}
              className="flex items-center justify-between gap-4 rounded px-1 py-0.5 text-[11px]"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <span className="truncate" style={{ color: 'var(--color-text-primary)' }}>{row.model}</span>
              <span className="flex items-center gap-3 shrink-0">
                <span style={{ color: 'var(--color-active)' }}>{formatCost(row.cost_usd)}</span>
                <span style={{ color: '#facc15' }}>
                  {formatTokens(parseInt(row.tokens_in) + parseInt(row.tokens_out))}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="px-1 py-2 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          No consumption today
        </div>
      )}

      <div className="my-2 h-px" style={{ background: 'var(--color-border)' }} />

      <label className="flex items-center justify-between gap-3 px-1 text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
        <span>Daily budget</span>
        <span className="flex items-center gap-1">
          <span style={{ color: 'var(--color-text-muted)' }}>$</span>
          <input
            type="number"
            min={1}
            step={1}
            value={dailyBudget}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (Number.isFinite(next) && next > 0) setDailyBudget(next);
            }}
            className="w-16 rounded px-1.5 py-0.5 text-right outline-none"
            style={{
              background: 'var(--color-surface-3)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-mono)',
            }}
          />
        </span>
      </label>
    </div>
  );
}
