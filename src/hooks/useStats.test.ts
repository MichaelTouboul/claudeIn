import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Stats } from './useStats';
import { useStats } from './useStats';

const getStats = vi.fn();

const sampleStats: Stats = {
  active_sessions: '2',
  total_events: '120',
  total_tokens_in: '5000',
  total_tokens_out: '3000',
  total_cost: 1.23,
  events_today: '12',
  cost_today: 0.45,
};

beforeEach(() => {
  getStats.mockReset();
  window.api = { getStats } as unknown as typeof window.api;
});

describe('useStats', () => {
  it('populates stats from window.api.getStats', async () => {
    getStats.mockResolvedValue(sampleStats);

    const { result } = renderHook(() => useStats());

    expect(result.current.stats).toBeNull();
    await waitFor(() => expect(result.current.stats).toEqual(sampleStats));
    expect(getStats).toHaveBeenCalledTimes(1);
  });

  it('keeps stats null and stays silent when getStats rejects', async () => {
    getStats.mockRejectedValue(new Error('ipc down'));

    const { result } = renderHook(() => useStats());

    await waitFor(() => expect(getStats).toHaveBeenCalled());
    expect(result.current.stats).toBeNull();
  });
});
