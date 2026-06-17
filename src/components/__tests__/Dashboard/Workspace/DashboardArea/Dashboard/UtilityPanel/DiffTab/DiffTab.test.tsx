import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DiffTab } from '@/components/Dashboard/Workspace/DashboardArea/Dashboard/UtilityPanel/DiffTab/DiffTab';
import { DiffMode, FileStatus, type RepoDiff } from '@/lib/types';
import { type PanelTab, PanelTabKind } from '@/store/dashboard/usePanelStore';

const gitDiff = vi.fn<(repoPath: string, mode: DiffMode) => Promise<RepoDiff>>();
window.api = { gitDiff } as unknown as typeof window.api;

function diffTab(repoPath: string): PanelTab {
  return { id: `diff:${repoPath}`, kind: PanelTabKind.Diff, title: 'Changes', payload: { repoPath } };
}

function modifiedDiff(): RepoDiff {
  return {
    mode: DiffMode.Working,
    truncated: false,
    files: [
      { path: 'a.ts', status: FileStatus.Modified, additions: 1, deletions: 1, binary: false, hunks: [] },
    ],
  };
}

beforeEach(() => gitDiff.mockReset());
afterEach(() => gitDiff.mockReset());

describe('DiffTab', () => {
  it('fetches the working diff on mount and lists changed files', async () => {
    gitDiff.mockResolvedValue(modifiedDiff());
    render(<DiffTab tab={diffTab('/repo')} />);
    await waitFor(() => expect(gitDiff).toHaveBeenCalledWith('/repo', DiffMode.Working));
    expect(await screen.findByText('a.ts')).toBeInTheDocument();
  });

  it('shows the empty state when there are no changes', async () => {
    gitDiff.mockResolvedValue({ mode: DiffMode.Working, truncated: false, files: [] });
    render(<DiffTab tab={diffTab('/repo')} />);
    expect(await screen.findByText(/no changes/i)).toBeInTheDocument();
  });

  it('surfaces a service error', async () => {
    gitDiff.mockResolvedValue({ mode: DiffMode.Working, truncated: false, files: [], error: 'Not a git repository' });
    render(<DiffTab tab={diffTab('/repo')} />);
    expect(await screen.findByText('Not a git repository')).toBeInTheDocument();
  });

  it('re-fetches in branch mode when the Branch toggle is clicked', async () => {
    gitDiff.mockResolvedValue({ ...modifiedDiff(), base: 'main' });
    render(<DiffTab tab={diffTab('/repo')} />);
    await waitFor(() => expect(gitDiff).toHaveBeenCalledWith('/repo', DiffMode.Working));
    fireEvent.click(await screen.findByRole('tab', { name: /branch/i }));
    await waitFor(() => expect(gitDiff).toHaveBeenCalledWith('/repo', DiffMode.Branch));
  });
});
