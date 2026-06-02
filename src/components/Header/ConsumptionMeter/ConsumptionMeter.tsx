import { useEffect, useState } from 'react';

import { Popover } from '@/components/_ui/Popover';
import { Progress } from '@/components/_ui/Progress';
import { useBudgetStore } from '@/store/useBudgetStore';
import type { CostsByModel } from '@/types/costs.types';

import { ModelBreakdown } from './ModelBreakdown';
import { fillRatio, formatCost, sumCost, thresholdColor } from './utils';

export type ConsumptionMeterProps = {
  /** Today's cost from the existing stats; used as the fallback if the per-model fetch fails. */
  fallbackCostToday: number;
  /** Refetch signal — the header's event counter; changes when new events arrive. */
  refreshSignal: number;
};

export function ConsumptionMeter({ fallbackCostToday, refreshSignal }: ConsumptionMeterProps) {
  const dailyBudget = useBudgetStore((s) => s.dailyBudget);
  const [rows, setRows] = useState<CostsByModel[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    window.api
      .getCostsByModel(1)
      .then((data) => {
        if (cancelled) return;
        setRows(data);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshSignal]);

  const costToday = failed ? fallbackCostToday : sumCost(rows);
  const ratio = fillRatio(costToday, dailyBudget);
  const color = thresholdColor(ratio);
  const label = `${formatCost(costToday)}/${formatCost(dailyBudget)}`;

  if (failed) {
    return (
      <div
        className="flex items-center gap-1 text-[11px]"
        style={{ color: 'var(--color-active)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
      >
        {formatCost(fallbackCostToday)}
      </div>
    );
  }

  return (
    <Popover
      align="end"
      trigger={
        <button
          type="button"
          aria-label={`Daily consumption ${label}. Open breakdown`}
          className="flex items-center gap-2 rounded outline-none"
          style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
        >
          <Progress
            value={ratio}
            fillColor={color}
            aria-label={`Daily consumption ${label}`}
            trackClassName="h-1.5 w-20"
          />
          <span className="text-[11px]" style={{ color }}>{label}</span>
        </button>
      }
    >
      <ModelBreakdown rows={rows} />
    </Popover>
  );
}
