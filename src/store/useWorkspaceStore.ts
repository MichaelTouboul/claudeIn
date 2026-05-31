import { create } from 'zustand';

import type { Project } from '@/types/dashboard.types';

import { useAppStore } from './useAppStore';

export type Dashboard = {
  id: string;
  project: Project;
};

type WorkspaceState = {
  dashboards: Dashboard[];
  activeDashboardId: string | null;
  openDashboard: (project: Project) => string;
  closeDashboard: (id: string) => void;
  setActiveDashboard: (id: string | null) => void;
};

let counter = 0;

function syncSelectedProject(dashboards: Dashboard[], activeId: string | null): void {
  const active = dashboards.find((d) => d.id === activeId) ?? null;
  useAppStore.getState().setSelectedProject(active ? active.project : null);
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  dashboards: [],
  activeDashboardId: null,

  openDashboard: (project) => {
    const existing = get().dashboards.find((d) => d.project.id === project.id);
    if (existing) {
      set({ activeDashboardId: existing.id });
      syncSelectedProject(get().dashboards, existing.id);
      return existing.id;
    }
    const id = `dash-${++counter}`;
    const dashboards = [...get().dashboards, { id, project }];
    set({ dashboards, activeDashboardId: id });
    syncSelectedProject(dashboards, id);
    return id;
  },

  closeDashboard: (id) => {
    const { dashboards, activeDashboardId } = get();
    const idx = dashboards.findIndex((d) => d.id === id);
    if (idx === -1) return;
    const next = dashboards.filter((d) => d.id !== id);
    let nextActive = activeDashboardId;
    if (activeDashboardId === id) {
      const neighbour = next[idx] ?? next[idx - 1] ?? null;
      nextActive = neighbour ? neighbour.id : null;
    }
    set({ dashboards: next, activeDashboardId: nextActive });
    syncSelectedProject(next, nextActive);
  },

  setActiveDashboard: (id) => {
    set({ activeDashboardId: id });
    syncSelectedProject(get().dashboards, id);
  },
}));
