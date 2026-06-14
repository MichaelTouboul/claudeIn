import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AgentsSnapshot, AgentSummary, McpServerEntry, McpSnapshot , Project , SkillsSnapshot, SkillSummary  } from '@/lib/types';

import { useDashboardStore } from '../useDashboardStore';

const PROJECT_PATH = '/proj';

function project(id: string, path: string): Project {
  return {
    id, name: id, path, claudeDir: `${path}/.claude`,
    hasAgents: true, hasSkills: true, hasSettings: false, agentCount: 0, skillCount: 0,
  };
}

function agent(id: string): AgentSummary {
  return {
    id, scope: 'project', filePath: `/a/${id}`, relativePath: `${id}.md`,
    folder: '', frontmatter: { name: id, description: id }, subAgents: [], shadowed: false,
  };
}

function skill(name: string): SkillSummary {
  return { name, description: '', scope: 'project', filePath: `/s/${name}`, lineCount: 1, shadowed: false };
}

function mcpServer(name: string): McpServerEntry {
  return {
    name, source: 'project-mcp-json', scope: 'project',
    transport: 'stdio', target: `cmd-${name}`, shadowed: false,
  };
}

// Captured live-subscription callbacks so tests can push mirror snapshots.
let agentsCb: ((s: AgentsSnapshot) => void) | null = null;
let skillsCb: ((s: SkillsSnapshot) => void) | null = null;
let mcpCb: ((s: McpSnapshot) => void) | null = null;

const watchAgents = vi.fn();
const unwatchAgents = vi.fn();
const watchSkills = vi.fn();
const unwatchSkills = vi.fn();
const watchMcp = vi.fn();
const unwatchMcp = vi.fn();
const unsubAgents = vi.fn();
const unsubSkills = vi.fn();
const unsubMcp = vi.fn();
const deleteAgent = vi.fn(() => Promise.resolve());

let dashboardAgents: AgentSummary[] = [];
let dashboardSkills: SkillSummary[] = [];
let dashboardMcp: McpServerEntry[] = [];

type Api = Window['api'];

function installApi(proj: Project): void {
  const api: Partial<Api> = {
    getDashboard: vi.fn(() => Promise.resolve({ project: proj, agents: [], skills: [], hooks: [] })),
    getAgentsMirror: vi.fn((p?: string) =>
      Promise.resolve<AgentsSnapshot>({ projectPath: p ?? null, agents: dashboardAgents })),
    getSkillsMirror: vi.fn((p?: string) =>
      Promise.resolve<SkillsSnapshot>({ projectPath: p ?? null, skills: dashboardSkills })),
    getMcp: vi.fn((p?: string) =>
      Promise.resolve<McpSnapshot>({ projectPath: p ?? null, servers: dashboardMcp })),
    watchAgents, unwatchAgents, watchSkills, unwatchSkills, watchMcp, unwatchMcp, deleteAgent,
    onAgentsChanged: vi.fn((cb: (s: AgentsSnapshot) => void) => { agentsCb = cb; return unsubAgents; }),
    onSkillsChanged: vi.fn((cb: (s: SkillsSnapshot) => void) => { skillsCb = cb; return unsubSkills; }),
    onMcpChanged: vi.fn((cb: (s: McpSnapshot) => void) => { mcpCb = cb; return unsubMcp; }),
  };
  window.api = api as Api;
}

beforeEach(() => {
  vi.clearAllMocks();
  agentsCb = null;
  skillsCb = null;
  mcpCb = null;
  dashboardAgents = [agent('a1')];
  dashboardSkills = [skill('s1')];
  dashboardMcp = [mcpServer('m1')];
  useDashboardStore.setState({ project: null, agents: [], skills: [], mcp: [], hooks: [], loading: false });
});

describe('useDashboardStore live wiring', () => {
  it('load populates agents/skills from the mirror getters (not getDashboard)', async () => {
    installApi(project('p1', PROJECT_PATH));
    await useDashboardStore.getState().load('p1');

    const s = useDashboardStore.getState();
    expect(s.agents.map((a) => a.id)).toEqual(['a1']);
    expect(s.skills.map((k) => k.name)).toEqual(['s1']);
    expect(window.api.getAgentsMirror).toHaveBeenCalledWith(PROJECT_PATH);
    expect(window.api.watchAgents).toHaveBeenCalledWith(PROJECT_PATH);
    expect(s.loading).toBe(false);
  });

  it('load seeds mcp from getMcp and watches the scope', async () => {
    installApi(project('p1', PROJECT_PATH));
    await useDashboardStore.getState().load('p1');

    const s = useDashboardStore.getState();
    expect(s.mcp.map((m) => m.name)).toEqual(['m1']);
    expect(window.api.getMcp).toHaveBeenCalledWith(PROJECT_PATH);
    expect(window.api.watchMcp).toHaveBeenCalledWith(PROJECT_PATH);
  });

  it('a matching-scope mcp push updates the store', async () => {
    installApi(project('p1', PROJECT_PATH));
    await useDashboardStore.getState().load('p1');

    mcpCb?.({ projectPath: PROJECT_PATH, servers: [mcpServer('m1'), mcpServer('m2')] });
    expect(useDashboardStore.getState().mcp.map((m) => m.name)).toEqual(['m1', 'm2']);
  });

  it('ignores an mcp push for a different scope', async () => {
    installApi(project('p1', PROJECT_PATH));
    await useDashboardStore.getState().load('p1');

    mcpCb?.({ projectPath: '/other', servers: [mcpServer('zzz')] });
    expect(useDashboardStore.getState().mcp.map((m) => m.name)).toEqual(['m1']);
  });

  it('passes undefined scope for the user project (user-only mirror)', async () => {
    installApi(project('user', '/home'));
    await useDashboardStore.getState().load('user');
    expect(window.api.getAgentsMirror).toHaveBeenCalledWith(undefined);
    expect(window.api.watchAgents).toHaveBeenCalledWith(undefined);
  });

  it('a matching-scope agents push updates the store', async () => {
    installApi(project('p1', PROJECT_PATH));
    await useDashboardStore.getState().load('p1');

    agentsCb?.({ projectPath: PROJECT_PATH, agents: [agent('a1'), agent('a2')] });
    expect(useDashboardStore.getState().agents.map((a) => a.id)).toEqual(['a1', 'a2']);

    skillsCb?.({ projectPath: PROJECT_PATH, skills: [skill('s1'), skill('s2')] });
    expect(useDashboardStore.getState().skills.map((k) => k.name)).toEqual(['s1', 's2']);
  });

  it('ignores a push for a different scope', async () => {
    installApi(project('p1', PROJECT_PATH));
    await useDashboardStore.getState().load('p1');

    agentsCb?.({ projectPath: '/other', agents: [agent('zzz')] });
    expect(useDashboardStore.getState().agents.map((a) => a.id)).toEqual(['a1']);
  });

  it('switching projects unwatches + unsubscribes the old scope', async () => {
    installApi(project('p1', PROJECT_PATH));
    await useDashboardStore.getState().load('p1');

    // Reload into a different project: the previous wiring must be torn down.
    installApi(project('p2', '/proj2'));
    await useDashboardStore.getState().load('p2');

    expect(unsubAgents).toHaveBeenCalled();
    expect(unsubSkills).toHaveBeenCalled();
    expect(unsubMcp).toHaveBeenCalled();
    expect(unwatchAgents).toHaveBeenCalled();
    expect(unwatchSkills).toHaveBeenCalled();
    expect(unwatchMcp).toHaveBeenCalled();
    expect(window.api.watchAgents).toHaveBeenLastCalledWith('/proj2');
  });

  it('deleteAgent calls the api and relies on the watcher (no manual reload)', async () => {
    installApi(project('p1', PROJECT_PATH));
    await useDashboardStore.getState().load('p1');
    const dashboardCallsBefore = (window.api.getDashboard as ReturnType<typeof vi.fn>).mock.calls.length;

    await useDashboardStore.getState().deleteAgent('a1');
    expect(window.api.deleteAgent).toHaveBeenCalledWith('a1');
    // No refresh()/getDashboard re-call — the live watcher refreshes the list.
    expect((window.api.getDashboard as ReturnType<typeof vi.fn>).mock.calls.length).toBe(dashboardCallsBefore);
  });
});
