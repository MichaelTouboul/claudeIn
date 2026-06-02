import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ActivitySnapshot } from '@/types/activity.types';

import { ActivityMeter } from './ActivityMeter';

const getActivity = vi.fn();

function snapshot(overrides: Partial<ActivitySnapshot> = {}): ActivitySnapshot {
  return {
    today: { messages: 12, sessions: 3, tokens: 1_200_000 },
    // Already sorted desc by tokens (the backend's contract).
    byModel: [
      { model: 'opus', tokens: 1_000_000, messages: 8 },
      { model: 'sonnet', tokens: 200_000, messages: 4 },
    ],
    byDay: [
      { date: '2026-05-27', messages: 1, tokens: 1000 },
      { date: '2026-05-28', messages: 2, tokens: 5000 },
      { date: '2026-05-29', messages: 0, tokens: 0 },
      { date: '2026-05-30', messages: 3, tokens: 8000 },
      { date: '2026-05-31', messages: 1, tokens: 2000 },
      { date: '2026-06-01', messages: 4, tokens: 9000 },
      { date: '2026-06-02', messages: 12, tokens: 1_200_000 },
    ],
    ...overrides,
  };
}

const emptySnapshot: ActivitySnapshot = {
  today: { messages: 0, sessions: 0, tokens: 0 },
  byModel: [],
  byDay: Array.from({ length: 7 }, (_, i) => ({
    date: `2026-05-${27 + i}`,
    messages: 0,
    tokens: 0,
  })),
};

beforeEach(() => {
  getActivity.mockReset();
  window.api = { getActivity } as unknown as typeof window.api;
});

describe('ActivityMeter', () => {
  it("renders today's token + session summary", async () => {
    getActivity.mockResolvedValue(snapshot());
    render(<ActivityMeter refreshSignal={0} />);
    await waitFor(() =>
      expect(screen.getByText(/1\.2M today · 3 sessions/)).not.toBeNull(),
    );
  });

  it('exposes the trigger as a button with an accessible name', async () => {
    getActivity.mockResolvedValue(snapshot());
    render(<ActivityMeter refreshSignal={0} />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Local activity/i })).not.toBeNull(),
    );
  });

  it('shows per-model rows sorted by tokens desc and day bars on click', async () => {
    getActivity.mockResolvedValue(snapshot());
    render(<ActivityMeter refreshSignal={0} />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Local activity/i })).not.toBeNull(),
    );
    fireEvent.click(screen.getByRole('button', { name: /Local activity/i }));

    expect(await screen.findByText('Local activity · this machine')).not.toBeNull();
    const opus = await screen.findByText('opus');
    const sonnet = screen.getByText('sonnet');
    // opus (1M) must precede sonnet (200K)
    expect(opus.compareDocumentPosition(sonnet) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // 7 day bars rendered as progressbars
    expect(screen.getAllByRole('progressbar').length).toBe(7);
  });

  it('shows the empty state when the snapshot has no activity', async () => {
    getActivity.mockResolvedValue(emptySnapshot);
    render(<ActivityMeter refreshSignal={0} />);
    await waitFor(() => expect(screen.getByText('No local activity yet')).not.toBeNull());
    expect(screen.queryByRole('button', { name: /Local activity/i })).toBeNull();
  });

  it('refetches when refreshSignal changes', async () => {
    getActivity.mockResolvedValue(snapshot());
    const { rerender } = render(<ActivityMeter refreshSignal={0} />);
    await waitFor(() => expect(getActivity).toHaveBeenCalledTimes(1));
    rerender(<ActivityMeter refreshSignal={1} />);
    await waitFor(() => expect(getActivity).toHaveBeenCalledTimes(2));
  });
});
