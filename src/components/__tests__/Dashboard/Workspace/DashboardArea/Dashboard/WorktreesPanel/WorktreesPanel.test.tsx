import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WorktreesPanel } from '@/components/Dashboard/Workspace/DashboardArea/Dashboard/WorktreesPanel/WorktreesPanel';
import type { GitBranchInfo, WorktreeStat } from '@/lib/types';
import { AgentPresenceStatus, useEventsStore } from '@/store/dashboard/useEventsStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

const gitBranches = vi.fn<(p: string) => Promise<GitBranchInfo>>();
const gitWorktreeStats = vi.fn<(p: string) => Promise<WorktreeStat[]>>();
const watchGitBranch = vi.fn(async () => {});
const unwatchGitBranch = vi.fn(async () => {});
const onEvent = vi.fn(() => () => {});
const gitWorktreeAdd = vi.fn();

window.api = {
  gitBranches,
  gitWorktreeStats,
  watchGitBranch,
  unwatchGitBranch,
  onEvent,
  gitWorktreeAdd,
} as unknown as typeof window.api;

const REPO = '/Users/me/claudein';

function branches(): GitBranchInfo {
  return {
    current: 'feature/x',
    worktrees: [
      { path: REPO, branch: '_main', detached: false },
      { path: `${REPO}/.worktrees/feature-x`, branch: 'feature/x', detached: false },
    ],
  };
}

function stats(): WorktreeStat[] {
  return [
    { path: REPO, additions: 0, deletions: 0, ahead: 0, base: '_main' },
    { path: `${REPO}/.worktrees/feature-x`, additions: 12, deletions: 4, ahead: 3, base: '_main' },
  ];
}

beforeEach(() => {
  gitBranches.mockResolvedValue(branches());
  gitWorktreeStats.mockResolvedValue(stats());
  // A live agent active in the feature worktree's session.
  useWorkspaceStore.setState({
    dashboards: [
      {
        id: 'd1',
        scope: { kind: 'user' },
        cwd: `${REPO}/.worktrees/feature-x`,
        tabs: [{ id: 't', kind: 'session', title: 'x', claudeSessionId: 'sess-1' }],
        activeTabId: 't',
      },
    ],
    activeDashboardId: 'd1',
  });
  useEventsStore.setState({
    presence: new Map([['sess-1', new Map([['refactorer', AgentPresenceStatus.Active]])]]),
  });
});

afterEach(() => {
  vi.clearAllMocks();
  useWorkspaceStore.setState({ dashboards: [], activeDashboardId: null });
  useEventsStore.setState({ presence: new Map() });
});

describe('WorktreesPanel', () => {
  it('renders the repo header with worktree + active counts', async () => {
    render(<WorktreesPanel repoPath={REPO} />);
    await waitFor(() => expect(gitWorktreeStats).toHaveBeenCalledWith(REPO));
    // 2 worktrees, 1 active (the feature worktree with the running agent).
    expect(await screen.findByText('2 worktrees · 1 active')).toBeInTheDocument();
  });

  it('shows each worktree card with branch, agent and diff stats', async () => {
    render(<WorktreesPanel repoPath={REPO} />);
    expect(await screen.findByText('feature/x')).toBeInTheDocument();
    expect(screen.getByText('_main')).toBeInTheDocument();
    expect(await screen.findByText('refactorer')).toBeInTheDocument();
    expect(screen.getByText('+12')).toBeInTheDocument();
    expect(screen.getByText('−4')).toBeInTheDocument();
    // "current" badge on the current worktree.
    expect(screen.getByText('current')).toBeInTheDocument();
  });

  it('filters to Idle hiding the running worktree', async () => {
    render(<WorktreesPanel repoPath={REPO} />);
    await screen.findByText('feature/x');

    fireEvent.click(screen.getByRole('tab', { name: 'Idle' }));
    // The idle base worktree stays; the running feature worktree is filtered out.
    expect(screen.getByText('_main')).toBeInTheDocument();
    expect(screen.queryByText('feature/x')).not.toBeInTheDocument();
  });

  it('opens the new-worktree dialog from the header button', async () => {
    render(<WorktreesPanel repoPath={REPO} />);
    await screen.findByText('feature/x');

    fireEvent.click(screen.getByRole('button', { name: 'New worktree' }));
    expect(await screen.findByPlaceholderText('feature/my-branch')).toBeInTheDocument();
  });
});
