import { describe, expect, it } from 'vitest';

import type { RepoWorktreeGroup } from '@/components/Dashboard/Workspace/DashboardArea/Dashboard/AllWorktreesPanel/allWorktreesModel';
import { flattenActiveWorktrees } from '@/components/Dashboard/Workspace/DashboardArea/Dashboard/LauncherView/WorktreeReentry/reentryModel';
import { type WorktreeRow,WorktreeStatus } from '@/components/Dashboard/Workspace/DashboardArea/Dashboard/WorktreesPanel/worktreeModel';

const row = (over: Partial<WorktreeRow>): WorktreeRow => ({
  path: '/p',
  branch: 'b',
  current: false,
  status: WorktreeStatus.Idle,
  agent: null,
  hue: 'blue',
  additions: 0,
  deletions: 0,
  ahead: 0,
  ...over,
});

const group = (name: string, rows: WorktreeRow[]): RepoWorktreeGroup => ({
  repoPath: `/work/${name}`,
  name,
  hue: 'green',
  rows,
});

describe('flattenActiveWorktrees', () => {
  it('keeps only non-idle rows, tagged with their repo identity', () => {
    const groups = [
      group('api', [
        row({ path: '/work/api', branch: 'main', status: WorktreeStatus.Idle }),
        row({ path: '/work/api/wt', branch: 'feat/x', status: WorktreeStatus.Running, agent: 'bot' }),
      ]),
      group('mcp', [row({ path: '/work/mcp/wt', branch: 'fix/y', status: WorktreeStatus.Review })]),
    ];
    const items = flattenActiveWorktrees(groups);
    expect(items.map((i) => `${i.repoName}/${i.row.branch}`)).toEqual(['api/feat/x', 'mcp/fix/y']);
    expect(items[0].repoPath).toBe('/work/api');
    expect(items[0].row.agent).toBe('bot');
  });

  it('returns [] when every worktree is idle', () => {
    const groups = [group('api', [row({ status: WorktreeStatus.Idle })])];
    expect(flattenActiveWorktrees(groups)).toEqual([]);
  });
});
