import { create } from "zustand";

import type { MainView } from "@/components/ProjectDashboard/types";
import type { AgentFile } from "@/types/agent.types";
import type { SkillFile } from "@/types/dashboard.types";

type ResumeChat = { agentName: string; sessionId: string; message: string } | null;

type DashboardUIState = {
  view: MainView;
  selectedAgent: AgentFile | null;
  selectedSkill: SkillFile | null;
  selectedSessionId: string | null;
  openPanels: Set<string>;
  scopeTab: "project" | "user";
  resumeChat: ResumeChat;

  setView: (view: MainView) => void;
  selectAgent: (a: AgentFile) => void;
  selectSkill: (s: SkillFile) => void;
  selectSession: (id: string) => void;
  togglePanel: (panel: string) => void;
  setScopeTab: (tab: "project" | "user") => void;
  setResumeChat: (r: ResumeChat) => void;
  setSelectedAgent: (a: AgentFile | null) => void;
};

export const useDashboardUIStore = create<DashboardUIState>((set) => ({
  view: "none",
  selectedAgent: null,
  selectedSkill: null,
  selectedSessionId: null,
  openPanels: new Set(),
  scopeTab: "project",
  resumeChat: null,

  setView: (view) => set({ view }),
  selectAgent: (a) => set({ selectedAgent: a, selectedSkill: null, view: "agent" }),
  selectSkill: (s) => set({ selectedSkill: s, selectedAgent: null, view: "skill" }),
  selectSession: (id) => set({ selectedSessionId: id, view: "session" }),
  togglePanel: (panel) =>
    set((s) => {
      const next = new Set(s.openPanels);
      if (next.has(panel)) next.delete(panel);
      else next.add(panel);
      return { openPanels: next };
    }),
  setScopeTab: (tab) => set({ scopeTab: tab }),
  setResumeChat: (resumeChat) => set({ resumeChat }),
  setSelectedAgent: (selectedAgent) => set({ selectedAgent }),
}));
