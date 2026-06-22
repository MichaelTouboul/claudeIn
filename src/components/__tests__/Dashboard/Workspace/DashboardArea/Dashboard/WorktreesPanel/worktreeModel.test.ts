import { describe, expect, it } from 'vitest';

import {
  activeCount,
  agentForPath,
  deriveWorktrees,
  filterWorktrees,
  hueForName,
  WorktreeFilter,
  WorktreeStatus,
  worktreeStatus,
} from '@/components/Dashboard/Workspace/DashboardArea/Dashboard/WorktreesPanel/worktreeModel';
import type { GitWorktree, WorktreeStat } from '@/lib/types';
import { AgentPresenceStatus, type SessionPresence } from '@/store/dashboard/useEventsStore';
import type { Dashboard } from '@/store/useWorkspaceStore';

const wt = (path: string, branch: string | null): GitWorktree => ({
  path,
  branch,
  detached: branch === null,
});

const dash = (cwd: string, claudeSessionId?: string): Dashboard => ({
  id: `d:${cwd}`,
  scope: { kind: 'user' },
  cwd,
  tabs: [{ id: 't', kind: 'session', title: 'x', claudeSessionId }],
  activeTabId: 't',
});

const presenceWith = (sessionId: string, agent: string, status: AgentPresenceStatus): SessionPresence =>
  new Map([[sessionId, new Map([[agent, status]])]]);

describe('hueForName', () => {
  it('is deterministic and stable per name', () => {
    expect(hueForName('refactorer')).toBe(hueForName('refactorer'));
  });
});

describe('worktreeStatus', () => {
  const stat = (over: Partial<WorktreeStat>): WorktreeStat => ({
    path: '/p',
    additions: 0,
    deletions: 0,
    ahead: 0,
    base: 'main',
    ...over,
  });

  it('is Running when an agent is active here', () => {
    expect(worktreeStatus('reviewer', false, stat({}))).toBe(WorktreeStatus.Running);
  });

  it('is Review when open with divergent work but no agent', () => {
    expect(worktreeStatus(null, true, stat({ ahead: 2 }))).toBe(WorktreeStatus.Review);
  });

  it('is Idle when open but no work and no agent', () => {
    expect(worktreeStatus(null, true, stat({}))).toBe(WorktreeStatus.Idle);
  });

  it('is Idle when it has work but is not open (closed) and no agent', () => {
    expect(worktreeStatus(null, false, stat({ ahead: 5 }))).toBe(WorktreeStatus.Idle);
  });
});

describe('agentForPath', () => {
  it('finds the active agent of a session open on the path', () => {
    const dashboards = [dash('/repo/wt', 'sess-1')];
    const presence = presenceWith('sess-1', 'refactorer', AgentPresenceStatus.Active);
    expect(agentForPath(dashboards, presence, '/repo/wt')).toBe('refactorer');
  });

  it('ignores idle agents and unmatched paths', () => {
    const dashboards = [dash('/repo/wt', 'sess-1')];
    const idle = presenceWith('sess-1', 'refactorer', AgentPresenceStatus.Idle);
    expect(agentForPath(dashboards, idle, '/repo/wt')).toBeNull();
    expect(agentForPath(dashboards, idle, '/other')).toBeNull();
  });
});

describe('deriveWorktrees', () => {
  it('joins stats, flags current, derives status + agent', () => {
    const rows = deriveWorktrees({
      worktrees: [wt('/repo', 'main'), wt('/repo/wt', 'feature/x')],
      current: 'feature/x',
      stats: [
        { path: '/repo', additions: 0, deletions: 0, ahead: 0, base: 'main' },
        { path: '/repo/wt', additions: 10, deletions: 3, ahead: 2, base: 'main' },
      ],
      dashboards: [dash('/repo/wt', 'sess-1')],
      presence: presenceWith('sess-1', 'reviewer', AgentPresenceStatus.Active),
    });

    const feature = rows.find((r) => r.branch === 'feature/x')!;
    expect(feature.current).toBe(true);
    expect(feature.status).toBe(WorktreeStatus.Running);
    expect(feature.agent).toBe('reviewer');
    expect(feature).toMatchObject({ additions: 10, deletions: 3, ahead: 2 });

    const base = rows.find((r) => r.branch === 'main')!;
    expect(base.current).toBe(false);
    expect(base.status).toBe(WorktreeStatus.Idle);
    expect(base.agent).toBeNull();
  });

  it('labels a detached worktree branch as (detached)', () => {
    const [row] = deriveWorktrees({
      worktrees: [wt('/repo/det', null)],
      current: null,
      stats: [],
      dashboards: [],
      presence: new Map(),
    });
    expect(row.branch).toBe('(detached)');
    expect(row.current).toBe(false);
  });
});

describe('filterWorktrees + activeCount', () => {
  const rows = deriveWorktrees({
    worktrees: [wt('/a', 'a'), wt('/b', 'b')],
    current: null,
    stats: [{ path: '/b', additions: 1, deletions: 0, ahead: 1, base: 'main' }],
    dashboards: [dash('/b', 'sess-b')],
    presence: presenceWith('sess-b', 'bot', AgentPresenceStatus.Active),
  });

  it('Active keeps only non-idle rows', () => {
    const active = filterWorktrees(rows, WorktreeFilter.Active);
    expect(active.map((r) => r.branch)).toEqual(['b']);
  });

  it('Idle keeps only idle rows', () => {
    const idle = filterWorktrees(rows, WorktreeFilter.Idle);
    expect(idle.map((r) => r.branch)).toEqual(['a']);
  });

  it('All keeps everything; activeCount counts non-idle', () => {
    expect(filterWorktrees(rows, WorktreeFilter.All)).toHaveLength(2);
    expect(activeCount(rows)).toBe(1);
  });
});
