import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_DAILY_BUDGET, useBudgetStore } from './useBudgetStore';

const STORAGE_KEY = 'cam:budget';

beforeEach(() => {
  localStorage.clear();
  useBudgetStore.setState({ dailyBudget: DEFAULT_DAILY_BUDGET });
});

describe('useBudgetStore', () => {
  it('defaults to the spec default budget', () => {
    expect(useBudgetStore.getState().dailyBudget).toBe(DEFAULT_DAILY_BUDGET);
  });

  it('setDailyBudget updates the value', () => {
    useBudgetStore.getState().setDailyBudget(25);
    expect(useBudgetStore.getState().dailyBudget).toBe(25);
  });

  it('persists the budget to localStorage', () => {
    useBudgetStore.getState().setDailyBudget(42);
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw ?? '{}').state.dailyBudget).toBe(42);
  });
});
