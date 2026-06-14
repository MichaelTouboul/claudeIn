import { beforeEach, describe, expect, it } from 'vitest';

import { useImproveModalStore } from '../useImproveModalStore';

beforeEach(() => {
  useImproveModalStore.setState({ open: false, target: null });
});

describe('useImproveModalStore', () => {
  it('starts closed with no target', () => {
    const s = useImproveModalStore.getState();
    expect(s.open).toBe(false);
    expect(s.target).toBeNull();
  });

  it('openImprove opens with a resolved component target', () => {
    useImproveModalStore.getState().openImprove({
      component: 'AgentChat',
      sourcePath: 'src/components/AgentChat/AgentChat.tsx:42',
    });
    const s = useImproveModalStore.getState();
    expect(s.open).toBe(true);
    expect(s.target).toEqual({
      component: 'AgentChat',
      sourcePath: 'src/components/AgentChat/AgentChat.tsx:42',
    });
  });

  it('openImprove(null) opens a general request with no target', () => {
    useImproveModalStore.getState().openImprove(null);
    const s = useImproveModalStore.getState();
    expect(s.open).toBe(true);
    expect(s.target).toBeNull();
  });

  it('closeImprove closes and clears the captured target', () => {
    useImproveModalStore.getState().openImprove({ component: 'Header' });
    useImproveModalStore.getState().closeImprove();
    const s = useImproveModalStore.getState();
    expect(s.open).toBe(false);
    expect(s.target).toBeNull();
  });
});
