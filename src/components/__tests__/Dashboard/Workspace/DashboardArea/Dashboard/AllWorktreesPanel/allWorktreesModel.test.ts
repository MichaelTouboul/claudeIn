import { describe, expect, it } from 'vitest';

import {
  deriveRepoGroups,
  filterRepoGroups,
  repoName,
  totalActive,
  totalWorktrees,
} from '@/components/Dashboard/Workspace/DashboardArea/Dashboard/AllWorktreesPanel/allWorktreesModel';
import { WorktreeFilter, WorktreeKind } from '@/components/Dashboard/Workspace/DashboardArea/Dashboard/WorktreesPanel/worktreeModel';
import type { RepoWorktrees } from '@/lib/types';
import { AgentPresenceStatus, type SessionPresence } from '@/store/dashboard/useEventsStore';
import type { Dashboard } from '@/store/useWorkspaceStore';

const dash = (cwd: string, claudeSessionId?: string): Dashboard => ({
  id: `d:${cwd}`,
  scope: { kind: 'user' },
  cwd,
  tabs: [{ id: 't', kind: 'session', title: 'x', claudeSessionId }],
  activeTabId: 't',
});

const presenceWith = (sessionId: string, agent: string): SessionPresence =>
  new Map([[sessionId, new Map([[agent, AgentPresenceStatus.Active]])]]);

const repoA: RepoWorktrees = {
  repoPath: '/work/api-gateway',
  branchInfo: {
    current: 'feat/rate-limit',
    worktrees: [
      { path: '/work/api-gateway', branch: 'main', detached: false },
      { path: '/work/api-gateway/.worktrees/feat', branch: 'feat/rate-limit', detached: false },
    ],
  },
  stats: [
    { path: '/work/api-gateway', additions: 0, deletions: 0, ahead: 0, base: 'main' },
    { path: '/work/api-gateway/.worktrees/feat', additions: 120, deletions: 9, ahead: 3, base: 'main' },
  ],
};

const repoB: RepoWorktrees = {
  repoPath: '/work/tw-mcp',
  branchInfo: { current: 'main', worktrees: [{ path: '/work/tw-mcp', branch: 'main', detached: false }] },
  stats: [{ path: '/work/tw-mcp', additions: 0, deletions: 0, ahead: 0, base: 'main' }],
};

describe('repoName', () => {
  it('returns the last path segment, trimming trailing slashes', () => {
    expect(repoName('/work/api-gateway')).toBe('api-gateway');
    expect(repoName('/work/tw-mcp/')).toBe('tw-mcp');
  });
});

describe('deriveRepoGroups', () => {
  it('groups by repo, reusing the per-repo status + agent derivation', () => {
    const groups = deriveRepoGroups({
      repos: [repoA, repoB],
      dashboards: [dash('/work/api-gateway/.worktrees/feat', 'sess-1')],
      presence: presenceWith('sess-1', 'refactorer'),
    });

    expect(groups.map((g) => g.name)).toEqual(['api-gateway', 'tw-mcp']);
    const feat = groups[0].rows.find((r) => r.branch === 'feat/rate-limit')!;
    expect(feat.status).toBe('running');
    expect(feat.agent).toBe('refactorer');
    expect(feat).toMatchObject({ additions: 120, deletions: 9, ahead: 3 });

    // The repo-root row (path === repoPath) is the Main worktree; the linked one is Linked.
    const root = groups[0].rows.find((r) => r.path === '/work/api-gateway')!;
    expect(root.current).toBe(false);
    expect(root.kind).toBe(WorktreeKind.Main);
    expect(feat.kind).toBe(WorktreeKind.Linked);
  });

  it('carries a repo enumeration error and yields no rows for it', () => {
    const bad: RepoWorktrees = {
      repoPath: '/bad/repo',
      branchInfo: { current: null, worktrees: [], error: 'Not a git repository' },
      stats: [],
    };
    const [group] = deriveRepoGroups({ repos: [bad], dashboards: [], presence: new Map() });
    expect(group.error).toBe('Not a git repository');
    expect(group.rows).toEqual([]);
  });
});

describe('filterRepoGroups + counts', () => {
  const groups = deriveRepoGroups({
    repos: [repoA, repoB],
    dashboards: [dash('/work/api-gateway/.worktrees/feat', 'sess-1')],
    presence: presenceWith('sess-1', 'refactorer'),
  });

  it('All keeps every group; counts span all repos', () => {
    expect(filterRepoGroups(groups, WorktreeFilter.All)).toHaveLength(2);
    expect(totalWorktrees(groups)).toBe(3);
    expect(totalActive(groups)).toBe(1);
  });

  it('Active drops repos left with no active rows', () => {
    const active = filterRepoGroups(groups, WorktreeFilter.Active);
    expect(active.map((g) => g.name)).toEqual(['api-gateway']);
    expect(active[0].rows.map((r) => r.branch)).toEqual(['feat/rate-limit']);
  });
});
