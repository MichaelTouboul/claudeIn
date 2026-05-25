import { create } from "zustand";

export type Project = {
  id: string;
  name: string;
  path: string;
  claudeDir: string;
  hasAgents: boolean;
  hasSkills: boolean;
  hasSettings: boolean;
  agentCount: number;
  skillCount: number;
};

type AppState = {
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
};

export const useAppStore = create<AppState>((set) => ({
  selectedProject: null,
  setSelectedProject: (project) => set({ selectedProject: project }),
}));
