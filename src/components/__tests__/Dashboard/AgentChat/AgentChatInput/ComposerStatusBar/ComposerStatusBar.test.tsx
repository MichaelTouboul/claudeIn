import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ComposerStatusBar } from '@/components/Dashboard/AgentChat/AgentChatInput/ComposerStatusBar/ComposerStatusBar';
import { PermissionMode } from '@/components/Dashboard/AgentChat/AgentChatInput/ComposerStatusBar/statusBar';
import type { GitBranchInfo } from '@/lib/types';

const branchInfo: GitBranchInfo = {
  current: 'main',
  worktrees: [{ path: '/repo', branch: 'main', detached: false }],
};

function renderBar(overrides: Partial<Parameters<typeof ComposerStatusBar>[0]> = {}) {
  const props = {
    branchInfo,
    percent: 31,
    tokensIn: 40_000,
    tokensOut: 22_000,
    costUsd: 0.48,
    models: [{ label: 'Sonnet 4.6', id: 'claude-sonnet-4-6' }],
    selectedModelId: 'claude-sonnet-4-6',
    onSelectModel: vi.fn(),
    permissionMode: PermissionMode.Ask,
    onSelectPermissionMode: vi.fn(),
    think: false,
    onToggleThink: vi.fn(),
    ...overrides,
  };
  render(<ComposerStatusBar {...props} />);
  return props;
}

describe('ComposerStatusBar', () => {
  it('shows the current branch, model, permission mode and formatted cost', () => {
    renderBar();
    expect(screen.getByText('main')).toBeInTheDocument();
    expect(screen.getByText('Sonnet 4.6')).toBeInTheDocument();
    expect(screen.getByText('Ask')).toBeInTheDocument();
    expect(screen.getByText('$0.48')).toBeInTheDocument();
  });

  it('exposes the context usage as a progressbar with the rounded percent', () => {
    renderBar({ percent: 31 });
    const bar = screen.getByRole('progressbar', { name: 'Context usage' });
    expect(bar).toHaveAttribute('aria-valuenow', '31');
  });

  it('toggles think when the pill is pressed', () => {
    const { onToggleThink } = renderBar({ think: false });
    const pill = screen.getByRole('button', { name: /think/i });
    expect(pill).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(pill);
    expect(onToggleThink).toHaveBeenCalledOnce();
  });

  it('reflects think on as a pressed pill', () => {
    renderBar({ think: true });
    expect(screen.getByRole('button', { name: /think/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('falls back to a dash when no branch is known', () => {
    renderBar({ branchInfo: null });
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('copies the branch name when the branch chip is clicked', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    renderBar();
    fireEvent.click(screen.getByRole('button', { name: 'Copy branch name' }));
    expect(writeText).toHaveBeenCalledWith('main');
  });
});

afterEach(() => {
  vi.clearAllMocks();
});
