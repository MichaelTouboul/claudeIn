import type { CostsByModel } from '@/types/costs.types';

/** Fill ratio in 0–1. Budget <= 0 is treated as unbounded → empty bar. */
export function fillRatio(costToday: number, dailyBudget: number): number {
  if (dailyBudget <= 0) return 0;
  return Math.min(costToday / dailyBudget, 1);
}

/** Color by spend threshold: <70% active/green, 70–90% yellow, >90% danger. */
export function thresholdColor(ratio: number): string {
  if (ratio > 0.9) return 'var(--color-danger)';
  if (ratio >= 0.7) return '#facc15';
  return 'var(--color-active)';
}

export function sumCost(rows: CostsByModel[]): number {
  return rows.reduce((acc, r) => acc + r.cost_usd, 0);
}

export function sortByCostDesc(rows: CostsByModel[]): CostsByModel[] {
  return [...rows].sort((a, b) => b.cost_usd - a.cost_usd);
}

export function formatCost(n: number): string {
  return `$${n.toFixed(2)}`;
}
