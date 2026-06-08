import { create } from "zustand";

import type { AgentSummary } from "@/types/agents-mirror.types";
import type { SkillSummary } from "@/types/skills-mirror.types";

type DashboardUIState = {
  selectedAgent: AgentSummary | null;
  selectedSkill: SkillSummary | null;
  selectedSessionId: string | null;
  openPanels: Set<string>;
  scopeTab: "project" | "user";

  selectAgent: (a: AgentSummary) => void;
  togglePanel: (panel: string) => void;
  // Idempotently reveal a sidebar panel (vs `togglePanel`). Used by the
  // `/agents` and `/skills` view slash commands to open the screen without
  // accidentally closing an already-open panel.
  openPanel: (panel: string) => void;
  setScopeTab: (tab: "project" | "user") => void;
  setSelectedAgent: (a: AgentSummary | null) => void;
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
  openPanel: (panel) =>
    set((s) => {
      if (s.openPanels.has(panel)) return s;
      const next = new Set(s.openPanels);
      next.add(panel);
      return { openPanels: next };
    }),
  setScopeTab: (tab) => set({ scopeTab: tab }),
  setSelectedAgent: (selectedAgent) => set({ selectedAgent }),
  backToProject: () => set({ selectedAgent: null, selectedSkill: null }),
}));
