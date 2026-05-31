import { create } from 'zustand';

import type { Project } from '@/types/dashboard.types';

import { useAppStore } from './useAppStore';

export type InternalTab = {
  id: string;
  kind: 'chat' | 'agent' | 'skill';
  title: string;
  agentName?: string;
  skillId?: string;
};

export type Dashboard = {
  id: string;
  project: Project;
  tabs: InternalTab[];
  activeTabId: string;
};

type WorkspaceState = {
  dashboards: Dashboard[];
  activeDashboardId: string | null;
  openDashboard: (project: Project) => string;
  closeDashboard: (id: string) => void;
  setActiveDashboard: (id: string | null) => void;
  addTab: (tab: Omit<InternalTab, 'id'>) => string;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
};

let counter = 0;
let tabCounter = 0;
const newTabId = () => `tab-${++tabCounter}`;
const defaultChatTab = (): InternalTab => ({ id: newTabId(), kind: 'chat', title: 'Chat' });

function syncSelectedProject(dashboards: Dashboard[], activeId: string | null): void {
  const active = dashboards.find((d) => d.id === activeId) ?? null;
  useAppStore.getState().setSelectedProject(active ? active.project : null);
}

function mapActive(
  dashboards: Dashboard[],
  activeId: string | null,
  fn: (d: Dashboard) => Dashboard,
): Dashboard[] {
  return dashboards.map((d) => (d.id === activeId ? fn(d) : d));
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
    const tab = defaultChatTab();
    const dashboards = [...get().dashboards, { id, project, tabs: [tab], activeTabId: tab.id }];
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

  addTab: (tab) => {
    const { dashboards, activeDashboardId } = get();
    const active = dashboards.find((d) => d.id === activeDashboardId);
    if (!active) return '';
    if (tab.kind === 'agent' || tab.kind === 'skill') {
      const key = tab.kind === 'agent' ? 'agentName' : 'skillId';
      const existing = active.tabs.find((t) => t.kind === tab.kind && t[key] === tab[key]);
      if (existing) {
        set({ dashboards: mapActive(dashboards, activeDashboardId, (d) => ({ ...d, activeTabId: existing.id })) });
        return existing.id;
      }
    }
    const id = newTabId();
    set({
      dashboards: mapActive(dashboards, activeDashboardId, (d) => ({
        ...d, tabs: [...d.tabs, { ...tab, id }], activeTabId: id,
      })),
    });
    return id;
  },

  closeTab: (tabId) => {
    const { dashboards, activeDashboardId } = get();
    const active = dashboards.find((d) => d.id === activeDashboardId);
    if (!active) return;
    const idx = active.tabs.findIndex((t) => t.id === tabId);
    if (idx === -1) return;
    let tabs = active.tabs.filter((t) => t.id !== tabId);
    let activeTabId = active.activeTabId;
    if (tabs.length === 0) {
      const seed = defaultChatTab();
      tabs = [seed];
      activeTabId = seed.id;
    } else if (active.activeTabId === tabId) {
      activeTabId = (tabs[idx] ?? tabs[idx - 1]).id;
    }
    set({ dashboards: mapActive(dashboards, activeDashboardId, (d) => ({ ...d, tabs, activeTabId })) });
  },

  setActiveTab: (tabId) => {
    const { dashboards, activeDashboardId } = get();
    set({ dashboards: mapActive(dashboards, activeDashboardId, (d) => ({ ...d, activeTabId: tabId })) });
  },
}));
