import { create } from "zustand";

import type { AgentFile } from "@/types/agent.types";
import type { HookConfig, Project, SkillFile } from "@/types/dashboard.types";

type DashboardState = {
  project: Project | null;
  agents: AgentFile[];
  skills: SkillFile[];
  hooks: HookConfig[];
  loading: boolean;
  load: (projectId: string) => Promise<void>;
  refresh: () => Promise<void>;
  toggleLink: (agentName: string, currentlyLinked: boolean) => Promise<void>;
  deleteAgent: (agentName: string) => Promise<void>;
};

let currentLoadId = 0;

export const useDashboardStore = create<DashboardState>((set, get) => ({
  project: null,
  agents: [],
  skills: [],
  hooks: [],
  loading: false,

  load: async (projectId: string) => {
    const id = ++currentLoadId;
    set({ loading: true });
    const data = await window.api.getDashboard(projectId);
    if (id !== currentLoadId) return; // superseded
    set({
      project: data.project,
      agents: data.agents,
      skills: data.skills,
      hooks: data.hooks,
      loading: false,
    });
  },

  refresh: async () => {
    const id = get().project?.id;
    if (!id) return;
    await get().load(id);
  },

  toggleLink: async (agentName, currentlyLinked) => {
    const id = get().project?.id;
    if (!id) return;
    if (currentlyLinked) {
      await window.api.unlinkAgent(agentName, id);
    } else {
      await window.api.linkAgent(agentName, id);
    }
    await get().refresh();
  },

  deleteAgent: async (agentName) => {
    await window.api.deleteAgent(agentName);
    await get().refresh();
  },
}));
