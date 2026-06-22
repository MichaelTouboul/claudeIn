import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GitBranchInfo } from '@/lib/types';

import { useGitBranches } from '../useGitBranches';

// The renderer reaches the back only through window.api; install typed stubs for
// just the methods this hook uses, restoring them after each case. jsdom has no
// preload, so window.api starts undefined — seed an empty object.
const originalApi = window.api;

// Captures the onEvent callback so a test can push a live `git:branch-changed`.
let pushEvent: ((data: unknown) => void) | null = null;

function stubApi(info: GitBranchInfo) {
  const gitBranches = vi.fn().mockResolvedValue(info);
  const watchGitBranch = vi.fn().mockResolvedValue(undefined);
  const unwatchGitBranch = vi.fn().mockResolvedValue(undefined);
  const onEvent = vi.fn((cb: (data: unknown) => void) => {
    pushEvent = cb;
    return () => {
      pushEvent = null;
    };
  });
  window.api = {
    ...(window.api ?? {}),
    gitBranches,
    watchGitBranch,
    unwatchGitBranch,
    onEvent,
  } as typeof window.api;
  return { gitBranches, watchGitBranch, unwatchGitBranch, onEvent };
}

beforeEach(() => {
  pushEvent = null;
  window.api = { ...(originalApi ?? {}) } as typeof window.api;
});
afterEach(() => {
  window.api = originalApi;
});

describe('useGitBranches', () => {
  it('returns null branch info before a repo path is known and does not call the back', () => {
    const { gitBranches, watchGitBranch } = stubApi({ current: 'main', worktrees: [] });
    const { result } = renderHook(() => useGitBranches(undefined));
    expect(result.current).toBeNull();
    expect(gitBranches).not.toHaveBeenCalled();
    expect(watchGitBranch).not.toHaveBeenCalled();
  });

  it('fetches the branch info for a repo path and starts the live watch', async () => {
    const info: GitBranchInfo = {
      current: 'main',
      worktrees: [{ path: '/repo', branch: 'main', detached: false }],
    };
    const { gitBranches, watchGitBranch } = stubApi(info);
    const { result } = renderHook(() => useGitBranches('/repo'));
    await waitFor(() => expect(result.current).toEqual(info));
    expect(gitBranches).toHaveBeenCalledWith('/repo');
    expect(watchGitBranch).toHaveBeenCalledWith('/repo');
  });

  it('updates live when a git:branch-changed event arrives for this repo', async () => {
    const initial: GitBranchInfo = { current: 'main', worktrees: [] };
    stubApi(initial);
    const { result } = renderHook(() => useGitBranches('/repo'));
    await waitFor(() => expect(result.current?.current).toBe('main'));

    const next: GitBranchInfo = { current: 'feature', worktrees: [] };
    act(() => {
      pushEvent?.({ type: 'git:branch-changed', repoPath: '/repo', info: next });
    });
    expect(result.current).toEqual(next);
  });

  it('ignores a git:branch-changed event for a different repo', async () => {
    const initial: GitBranchInfo = { current: 'main', worktrees: [] };
    stubApi(initial);
    const { result } = renderHook(() => useGitBranches('/repo'));
    await waitFor(() => expect(result.current?.current).toBe('main'));

    act(() => {
      pushEvent?.({
        type: 'git:branch-changed',
        repoPath: '/other-repo',
        info: { current: 'feature', worktrees: [] },
      });
    });
    expect(result.current?.current).toBe('main');
  });

  it('stops the watch when the path changes/unmounts', async () => {
    const { unwatchGitBranch } = stubApi({ current: 'main', worktrees: [] });
    const { unmount, result } = renderHook(() => useGitBranches('/repo'));
    await waitFor(() => expect(result.current?.current).toBe('main'));
    unmount();
    expect(unwatchGitBranch).toHaveBeenCalledWith('/repo');
  });
});
