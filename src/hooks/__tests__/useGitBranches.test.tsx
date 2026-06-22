import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GitBranchInfo } from '@/lib/types';

import { useGitBranches } from '../useGitBranches';

// The renderer reaches the back only through window.api; install a typed stub
// for just the one method this hook uses, restoring it after each case. jsdom
// has no preload, so window.api starts undefined — seed an empty object.
const originalApi = window.api;

function stubApi(info: GitBranchInfo) {
  const gitBranches = vi.fn().mockResolvedValue(info);
  window.api = { ...(window.api ?? {}), gitBranches } as typeof window.api;
  return gitBranches;
}

beforeEach(() => {
  window.api = { ...(originalApi ?? {}) } as typeof window.api;
});
afterEach(() => {
  window.api = originalApi;
});

describe('useGitBranches', () => {
  it('returns null branch info before a repo path is known and does not call the back', () => {
    const gitBranches = stubApi({ current: 'main', worktrees: [] });
    const { result } = renderHook(() => useGitBranches(undefined));
    expect(result.current).toBeNull();
    expect(gitBranches).not.toHaveBeenCalled();
  });

  it('fetches the branch info for a repo path', async () => {
    const info: GitBranchInfo = {
      current: 'main',
      worktrees: [{ path: '/repo', branch: 'main', detached: false }],
    };
    const gitBranches = stubApi(info);
    const { result } = renderHook(() => useGitBranches('/repo'));
    await waitFor(() => expect(result.current).toEqual(info));
    expect(gitBranches).toHaveBeenCalledWith('/repo');
  });
});
