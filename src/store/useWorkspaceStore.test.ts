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

  it('addTab dedupes a session tab by sessionFilePath (re-activates, no duplicate)', () => {
    useWorkspaceStore.getState().openDashboard(proj('a'));
    const id1 = useWorkspaceStore.getState().addTab({
      kind: 'session', title: 'Conv', sessionFilePath: '/s/conv.jsonl', sessionId: 'conv',
    });
    useWorkspaceStore.getState().addTab({ kind: 'chat', title: 'Chat' });
    const id2 = useWorkspaceStore.getState().addTab({
      kind: 'session', title: 'Conv', sessionFilePath: '/s/conv.jsonl', sessionId: 'conv',
    });
    expect(id2).toBe(id1);
    expect(useWorkspaceStore.getState().dashboards[0].tabs.filter((t) => t.kind === 'session')).toHaveLength(1);
    expect(useWorkspaceStore.getState().dashboards[0].activeTabId).toBe(id1);
  });

  it('addTab dedupes a session tab by sessionId even when filePath differs', () => {
    useWorkspaceStore.getState().openDashboard(proj('a'));
    const id1 = useWorkspaceStore.getState().addTab({
      kind: 'session', title: 'Conv', sessionFilePath: '/s/conv.jsonl', sessionId: 'conv',
    });
    const id2 = useWorkspaceStore.getState().addTab({
      kind: 'session', title: 'Conv', sessionFilePath: '/other/conv.jsonl', sessionId: 'conv',
    });
    expect(id2).toBe(id1);
    expect(useWorkspaceStore.getState().dashboards[0].tabs.filter((t) => t.kind === 'session')).toHaveLength(1);
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

  it('openDashboard sets project scope and cwd = project.path', () => {
    const a = proj('a');
    useWorkspaceStore.getState().openDashboard(a);
    const d = useWorkspaceStore.getState().dashboards[0];
    expect(d.scope).toEqual({ kind: 'project', project: a });
    expect(d.cwd).toBe('/p/a');
  });

  it('openLauncher creates a launcher dashboard, activates it, no tabs, clears selectedProject', () => {
    useAppStore.setState({ selectedProject: proj('a') });
    const id = useWorkspaceStore.getState().openLauncher();
    const s = useWorkspaceStore.getState();
    const d = s.dashboards.find((x) => x.id === id)!;
    expect(s.activeDashboardId).toBe(id);
    expect(d.scope.kind).toBe('launcher');
    expect(d.tabs).toHaveLength(0);
    expect(d.cwd).toBe('');
    expect(useAppStore.getState().selectedProject).toBeNull();
  });

  it('resolveLauncher to project transforms scope, sets cwd and seeds a chat tab', () => {
    const id = useWorkspaceStore.getState().openLauncher();
    const a = proj('a');
    useWorkspaceStore.getState().resolveLauncher(id, { to: 'project', project: a });
    const d = useWorkspaceStore.getState().dashboards.find((x) => x.id === id)!;
    expect(d.scope).toEqual({ kind: 'project', project: a });
    expect(d.cwd).toBe('/p/a');
    expect(d.tabs).toHaveLength(1);
    expect(d.tabs[0].kind).toBe('chat');
    expect(d.activeTabId).toBe(d.tabs[0].id);
    expect(useAppStore.getState().selectedProject?.id).toBe('a');
  });

  it('resolveLauncher to discussion sets user scope, cwd = home, empty agentName', () => {
    useWorkspaceStore.getState().setHomeDir('/home/me');
    const id = useWorkspaceStore.getState().openLauncher();
    useWorkspaceStore.getState().resolveLauncher(id, { to: 'discussion' });
    const d = useWorkspaceStore.getState().dashboards.find((x) => x.id === id)!;
    expect(d.scope.kind).toBe('user');
    expect(d.cwd).toBe('/home/me');
    expect(d.tabs).toHaveLength(1);
    expect(d.tabs[0].kind).toBe('chat');
    expect(d.tabs[0].agentName).toBe('');
    expect(useAppStore.getState().selectedProject).toBeNull();
  });

  it('resolveLauncher to agent sets user scope, cwd = home, agentName + title', () => {
    useWorkspaceStore.getState().setHomeDir('/home/me');
    const id = useWorkspaceStore.getState().openLauncher();
    useWorkspaceStore.getState().resolveLauncher(id, { to: 'agent', agentName: 'tw-dev' });
    const d = useWorkspaceStore.getState().dashboards.find((x) => x.id === id)!;
    expect(d.scope.kind).toBe('user');
    expect(d.cwd).toBe('/home/me');
    expect(d.tabs[0].agentName).toBe('tw-dev');
    expect(d.tabs[0].title).toBe('tw-dev');
  });

  it('retitleChatTab renames a matching agent chat tab when its title is generic', () => {
    useWorkspaceStore.getState().openDashboard(proj('a'));
    const tabId = useWorkspaceStore.getState().addTab({ kind: 'chat', title: 'Chat', agentName: 'tw-dev' });
    useWorkspaceStore.getState().retitleChatTab('tw-dev', 'Fix the login bug');
    const tab = useWorkspaceStore.getState().dashboards[0].tabs.find((t) => t.id === tabId)!;
    expect(tab.title).toBe('Fix the login bug');
  });

  it('retitleChatTab leaves a user-renamed (non-generic) tab untouched', () => {
    useWorkspaceStore.getState().openDashboard(proj('a'));
    const tabId = useWorkspaceStore.getState().addTab({ kind: 'chat', title: 'My custom name', agentName: 'tw-dev' });
    useWorkspaceStore.getState().retitleChatTab('tw-dev', 'AI title');
    const tab = useWorkspaceStore.getState().dashboards[0].tabs.find((t) => t.id === tabId)!;
    expect(tab.title).toBe('My custom name');
  });

  it('retitleChatTab with force overwrites a non-generic (user-renamed/AI) tab title', () => {
    useWorkspaceStore.getState().openDashboard(proj('a'));
    const tabId = useWorkspaceStore.getState().addTab({ kind: 'chat', title: 'AI title', agentName: 'tw-dev' });
    useWorkspaceStore.getState().retitleChatTab('tw-dev', 'User rename', true);
    const tab = useWorkspaceStore.getState().dashboards[0].tabs.find((t) => t.id === tabId)!;
    expect(tab.title).toBe('User rename');
  });

  it('retitleChatTab without force does NOT overwrite a non-generic tab title', () => {
    useWorkspaceStore.getState().openDashboard(proj('a'));
    const tabId = useWorkspaceStore.getState().addTab({ kind: 'chat', title: 'AI title', agentName: 'tw-dev' });
    useWorkspaceStore.getState().retitleChatTab('tw-dev', 'User rename');
    const tab = useWorkspaceStore.getState().dashboards[0].tabs.find((t) => t.id === tabId)!;
    expect(tab.title).toBe('AI title');
  });

  it('retitleChatTab leaves a non-matching agent tab untouched', () => {
    useWorkspaceStore.getState().openDashboard(proj('a'));
    const tabId = useWorkspaceStore.getState().addTab({ kind: 'chat', title: 'Chat', agentName: 'other' });
    useWorkspaceStore.getState().retitleChatTab('tw-dev', 'AI title');
    const tab = useWorkspaceStore.getState().dashboards[0].tabs.find((t) => t.id === tabId)!;
    expect(tab.title).toBe('Chat');
  });

  it('retitleChatTab for "_main" matches the default chat tab (no agentName)', () => {
    useWorkspaceStore.getState().openDashboard(proj('a'));
    // The default chat tab has no agentName; the main chat spawns as "_main".
    useWorkspaceStore.getState().retitleChatTab('_main', 'Greeting');
    const tab = useWorkspaceStore.getState().dashboards[0].tabs[0];
    expect(tab.title).toBe('Greeting');
  });

  it('setTabClaudeSessionId stamps the conversation id onto the matching tab', () => {
    useWorkspaceStore.getState().openDashboard(proj('a'));
    const tabId = useWorkspaceStore.getState().dashboards[0].tabs[0].id;
    useWorkspaceStore.getState().setTabClaudeSessionId(tabId, 'sess-123');
    const tab = useWorkspaceStore.getState().dashboards[0].tabs.find((t) => t.id === tabId)!;
    expect(tab.claudeSessionId).toBe('sess-123');
  });

  it('setTabClaudeSessionId is a no-op when the id already matches (stable reference)', () => {
    useWorkspaceStore.getState().openDashboard(proj('a'));
    const tabId = useWorkspaceStore.getState().dashboards[0].tabs[0].id;
    useWorkspaceStore.getState().setTabClaudeSessionId(tabId, 'sess-123');
    const before = useWorkspaceStore.getState().dashboards;
    useWorkspaceStore.getState().setTabClaudeSessionId(tabId, 'sess-123');
    expect(useWorkspaceStore.getState().dashboards).toBe(before);
  });

  it('addTab dedupes an mcp tab by kind (one MCP tab per project, re-activates)', () => {
    useWorkspaceStore.getState().openDashboard(proj('a'));
    const id1 = useWorkspaceStore.getState().addTab({ kind: 'mcp', title: 'MCP Servers' });
    useWorkspaceStore.getState().addTab({ kind: 'chat', title: 'Chat' });
    const id2 = useWorkspaceStore.getState().addTab({ kind: 'mcp', title: 'MCP Servers' });
    expect(id2).toBe(id1);
    expect(useWorkspaceStore.getState().dashboards[0].tabs.filter((t) => t.kind === 'mcp')).toHaveLength(1);
    expect(useWorkspaceStore.getState().dashboards[0].activeTabId).toBe(id1);
  });

  it('retitleChatTab does not touch non-chat tabs', () => {
    useWorkspaceStore.getState().openDashboard(proj('a'));
    const agentTabId = useWorkspaceStore.getState().addTab({ kind: 'agent', title: 'Chat', agentName: 'tw-dev' });
    useWorkspaceStore.getState().retitleChatTab('tw-dev', 'AI title');
    const tab = useWorkspaceStore.getState().dashboards[0].tabs.find((t) => t.id === agentTabId)!;
    expect(tab.title).toBe('Chat');
  });
});
