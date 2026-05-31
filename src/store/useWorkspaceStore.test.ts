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

  it('a new dashboard starts with one default chat tab', () => {
    useWorkspaceStore.getState().openDashboard(proj('a'));
    const d = useWorkspaceStore.getState().dashboards[0];
    expect(d.tabs).toHaveLength(1);
    expect(d.tabs[0].kind).toBe('chat');
    expect(d.activeTabId).toBe(d.tabs[0].id);
  });

  it('addTab appends a tab to the active dashboard and activates it', () => {
    useWorkspaceStore.getState().openDashboard(proj('a'));
    const id = useWorkspaceStore.getState().addTab({ kind: 'agent', title: 'x', agentName: 'x' });
    const d = useWorkspaceStore.getState().dashboards[0];
    expect(d.tabs).toHaveLength(2);
    expect(d.activeTabId).toBe(id);
  });

  it('addTab dedupes an agent tab by agentName (re-activates)', () => {
    useWorkspaceStore.getState().openDashboard(proj('a'));
    const id1 = useWorkspaceStore.getState().addTab({ kind: 'agent', title: 'x', agentName: 'x' });
    useWorkspaceStore.getState().addTab({ kind: 'chat', title: 'Chat' });
    const id2 = useWorkspaceStore.getState().addTab({ kind: 'agent', title: 'x', agentName: 'x' });
    expect(id2).toBe(id1);
    expect(useWorkspaceStore.getState().dashboards[0].tabs.filter((t) => t.kind === 'agent')).toHaveLength(1);
    expect(useWorkspaceStore.getState().dashboards[0].activeTabId).toBe(id1);
  });

  it('closeTab on the last tab re-seeds a default chat tab', () => {
    useWorkspaceStore.getState().openDashboard(proj('a'));
    const only = useWorkspaceStore.getState().dashboards[0].tabs[0].id;
    useWorkspaceStore.getState().closeTab(only);
    const d = useWorkspaceStore.getState().dashboards[0];
    expect(d.tabs).toHaveLength(1);
    expect(d.tabs[0].kind).toBe('chat');
    expect(d.tabs[0].id).not.toBe(only);
  });
});
