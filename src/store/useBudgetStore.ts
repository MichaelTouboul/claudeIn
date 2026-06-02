import { create } from "zustand";
import { persist } from "zustand/middleware";

export const DEFAULT_DAILY_BUDGET = 10;

type BudgetState = {
  dailyBudget: number;
  setDailyBudget: (n: number) => void;
};

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set) => ({
      dailyBudget: DEFAULT_DAILY_BUDGET,
      setDailyBudget: (n) => set({ dailyBudget: n }),
    }),
    { name: "cam:budget" },
  ),
);
