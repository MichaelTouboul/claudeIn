import { create } from "zustand";

import type { AgentFile } from "@/types/agent.types";
import type { SkillFile } from "@/types/dashboard.types";

type DashboardUIState = {
  selectedAgent: AgentFile | null;
  selectedSkill: SkillFile | null;
  selectedSessionId: string | null;
  openPanels: Set<string>;
  scopeTab: "project" | "user";

  selectAgent: (a: AgentFile) => void;
  togglePanel: (panel: string) => void;
  setScopeTab: (tab: "project" | "user") => void;
  setSelectedAgent: (a: AgentFile | null) => void;
  backToProject: () => void;
};

export const useDashboardUIStore = create<DashboardUIState>((set) => ({
  selectedAgent: null,
  selectedSkill: null,
  selectedSessionId: null,
  openPanels: new Set(),
  scopeTab: "project",

  selectAgent: (a) => set({ selectedAgent: a, selectedSkill: null }),
  togglePanel: (panel) =>
    set((s) => {
      const next = new Set(s.openPanels);
      if (next.has(panel)) next.delete(panel);
      else next.add(panel);
      return { openPanels: next };
    }),
  setScopeTab: (tab) => set({ scopeTab: tab }),
  setSelectedAgent: (selectedAgent) => set({ selectedAgent }),
  backToProject: () => set({ selectedAgent: null, selectedSkill: null }),
}));
