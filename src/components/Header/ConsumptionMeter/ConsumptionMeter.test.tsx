import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_DAILY_BUDGET, useBudgetStore } from '@/store/useBudgetStore';
import type { CostsByModel } from '@/types/costs.types';

import { ConsumptionMeter } from './ConsumptionMeter';
import { fillRatio, sortByCostDesc, sumCost, thresholdColor } from './utils';

function model(model_: string, cost: number, tin = '0', tout = '0'): CostsByModel {
  return { model: model_, tokens_in: tin, tokens_out: tout, cost_usd: cost, events_count: '1' };
}

const getCostsByModel = vi.fn();

beforeEach(() => {
  localStorage.clear();
  useBudgetStore.setState({ dailyBudget: DEFAULT_DAILY_BUDGET });
  getCostsByModel.mockReset();
  window.api = { getCostsByModel } as unknown as typeof window.api;
});

describe('ConsumptionMeter utils', () => {
  it('fillRatio clamps to 1 and treats budget<=0 as unbounded', () => {
    expect(fillRatio(4, 10)).toBeCloseTo(0.4);
    expect(fillRatio(20, 10)).toBe(1);
    expect(fillRatio(5, 0)).toBe(0);
  });

  it('thresholdColor maps ranges to active / yellow / danger', () => {
    expect(thresholdColor(0.5)).toBe('var(--color-active)');
    expect(thresholdColor(0.7)).toBe('#facc15');
    expect(thresholdColor(0.95)).toBe('var(--color-danger)');
  });

  it('sumCost adds cost_usd; sortByCostDesc orders by cost', () => {
    const rows = [model('a', 1), model('b', 3), model('c', 2)];
    expect(sumCost(rows)).toBe(6);
    expect(sortByCostDesc(rows).map((r) => r.model)).toEqual(['b', 'c', 'a']);
  });
});

describe('ConsumptionMeter', () => {
  it('renders the bar label from summed cost vs budget', async () => {
    getCostsByModel.mockResolvedValue([model('opus', 3), model('sonnet', 1.2)]);
    render(<ConsumptionMeter fallbackCostToday={0} refreshSignal={0} />);
    await waitFor(() => expect(screen.getByText('$4.20/$10.00')).not.toBeNull());
  });

  it('exposes the bar as a progressbar with aria value reflecting fill %', async () => {
    getCostsByModel.mockResolvedValue([model('opus', 5)]); // 5/10 = 50%
    render(<ConsumptionMeter fallbackCostToday={0} refreshSignal={0} />);
    await waitFor(() => {
      const bar = screen.getByRole('progressbar');
      expect(bar.getAttribute('aria-valuenow')).toBe('50');
    });
  });

  it('exposes the bar trigger as a button with an accessible name', async () => {
    getCostsByModel.mockResolvedValue([model('opus', 2)]);
    render(<ConsumptionMeter fallbackCostToday={0} refreshSignal={0} />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Daily consumption/i })).not.toBeNull(),
    );
  });

  it('falls back to plain fallback cost when the fetch rejects (no bar)', async () => {
    getCostsByModel.mockRejectedValue(new Error('boom'));
    render(<ConsumptionMeter fallbackCostToday={7.5} refreshSignal={0} />);
    await waitFor(() => expect(screen.getByText('$7.50')).not.toBeNull());
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('shows the model breakdown rows sorted by cost desc on click', async () => {
    getCostsByModel.mockResolvedValue([model('cheap', 1, '1000', '0'), model('pricey', 9, '2000', '0')]);
    render(<ConsumptionMeter fallbackCostToday={0} refreshSignal={0} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Daily consumption/i })).not.toBeNull());
    fireEvent.click(screen.getByRole('button', { name: /Daily consumption/i }));

    const pricey = await screen.findByText('pricey');
    const cheap = screen.getByText('cheap');
    expect(pricey.compareDocumentPosition(cheap) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows the empty state when there is no consumption today', async () => {
    getCostsByModel.mockResolvedValue([]);
    render(<ConsumptionMeter fallbackCostToday={0} refreshSignal={0} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Daily consumption/i })).not.toBeNull());
    fireEvent.click(screen.getByRole('button', { name: /Daily consumption/i }));
    expect(await screen.findByText('No consumption today')).not.toBeNull();
  });

  it('editing the budget input updates the store', async () => {
    getCostsByModel.mockResolvedValue([model('opus', 2)]);
    render(<ConsumptionMeter fallbackCostToday={0} refreshSignal={0} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Daily consumption/i })).not.toBeNull());
    fireEvent.click(screen.getByRole('button', { name: /Daily consumption/i }));

    const input = await screen.findByRole('spinbutton');
    fireEvent.change(input, { target: { value: '30' } });
    expect(useBudgetStore.getState().dailyBudget).toBe(30);
  });
});
