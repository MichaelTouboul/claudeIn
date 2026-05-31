import { beforeEach, describe, expect, it } from 'vitest';

import type { Project } from '@/types/dashboard.types';

import { useAppStore } from './useAppStore';
import { useWorkspaceStore } from './useWorkspaceStore';

const proj = (id: string): Project => ({
  id, name: id, path: `/p/${id}`, claudeDir: `/p/${id}/.claude`,
  hasAgents: true, hasSkills: true, hasSettings: true, agentCount: 0, skillCount: 0,
});

const initial = useWorkspaceStore.getState();
beforeEach(() => {
  useWorkspaceStore.setState(initial, true);
  useAppStore.setState({ selectedProject: null });
});

describe('useWorkspaceStore', () => {
  it('openDashboard opens a tab, activates it, and mirrors selectedProject', () => {
    const a = proj('a');
    const id = useWorkspaceStore.getState().openDashboard(a);
    const s = useWorkspaceStore.getState();
    expect(s.dashboards).toHaveLength(1);
    expect(s.activeDashboardId).toBe(id);
    expect(useAppStore.getState().selectedProject?.id).toBe('a');
  });

  it('openDashboard dedupes by project id (re-activates instead of duplicating)', () => {
    const a = proj('a');
    const id1 = useWorkspaceStore.getState().openDashboard(a);
    useWorkspaceStore.getState().openDashboard(proj('b'));
    const id2 = useWorkspaceStore.getState().openDashboard(a);
    expect(id2).toBe(id1);
    expect(useWorkspaceStore.getState().dashboards).toHaveLength(2);
    expect(useWorkspaceStore.getState().activeDashboardId).toBe(id1);
  });

  it('closeDashboard on the active tab activates a neighbour', () => {
    const ws = useWorkspaceStore.getState();
    const idA = ws.openDashboard(proj('a'));
    const idB = ws.openDashboard(proj('b'));
    expect(useWorkspaceStore.getState().activeDashboardId).toBe(idB);
    useWorkspaceStore.getState().closeDashboard(idB);
    expect(useWorkspaceStore.getState().activeDashboardId).toBe(idA);
    expect(useAppStore.getState().selectedProject?.id).toBe('a');
  });

  it('closing the last tab clears active and selectedProject', () => {
    const id = useWorkspaceStore.getState().openDashboard(proj('a'));
    useWorkspaceStore.getState().closeDashboard(id);
    expect(useWorkspaceStore.getState().dashboards).toHaveLength(0);
    expect(useWorkspaceStore.getState().activeDashboardId).toBeNull();
    expect(useAppStore.getState().selectedProject).toBeNull();
  });
});
