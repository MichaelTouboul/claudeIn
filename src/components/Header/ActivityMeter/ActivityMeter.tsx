import { useEffect, useState } from 'react';

import { Popover } from '@/components/_ui/Popover';
import { formatTokens } from '@/lib/formatTokens';
import type { ActivitySnapshot } from '@/types/activity.types';

import { ActivityBreakdown } from './ActivityBreakdown';

export type ActivityMeterProps = {
  /** Refetch signal — the header's event counter; changes when new events arrive. */
  refreshSignal: number;
};

/** A snapshot is "empty" when there is no activity to show anywhere in the window. */
function isEmpty(snapshot: ActivitySnapshot | null): boolean {
  if (!snapshot) return true;
  return (
    snapshot.today.tokens === 0 &&
    snapshot.today.messages === 0 &&
    snapshot.byModel.length === 0
  );
}

export function ActivityMeter({ refreshSignal }: ActivityMeterProps) {
  const [snapshot, setSnapshot] = useState<ActivitySnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    window.api
      .getActivity(7)
      .then((data) => {
        if (!cancelled) setSnapshot(data);
      })
      .catch(() => {
        if (!cancelled) setSnapshot(null);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshSignal]);

  if (isEmpty(snapshot)) {
    return (
      <div
        className="flex items-center gap-1 text-[11px]"
        style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
      >
        No local activity yet
      </div>
    );
  }

  const today = snapshot!.today;
  const label = `⚡ ${formatTokens(today.tokens)} today · ${today.sessions} sessions`;

  return (
    <Popover
      align="end"
      trigger={
        <button
          type="button"
          aria-label={`Local activity: ${formatTokens(today.tokens)} tokens today across ${today.sessions} sessions. Open breakdown`}
          className="flex items-center gap-1 rounded text-[11px] outline-none"
          style={{
            color: 'var(--color-accent)',
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {label}
        </button>
      }
    >
      <ActivityBreakdown snapshot={snapshot!} />
    </Popover>
  );
}
