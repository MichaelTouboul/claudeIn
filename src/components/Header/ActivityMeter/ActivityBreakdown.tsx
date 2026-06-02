import { Progress } from '@/components/_ui/Progress';
import { formatTokens } from '@/lib/formatTokens';
import type { ActivitySnapshot } from '@/types/activity.types';

export type ActivityBreakdownProps = {
  snapshot: ActivitySnapshot;
};

/** Short weekday label (e.g. "Mon") for a YYYY-MM-DD date. */
function dayLabel(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' });
}

export function ActivityBreakdown({ snapshot }: ActivityBreakdownProps) {
  const { byDay, byModel } = snapshot;
  const maxDayTokens = byDay.reduce((m, d) => Math.max(m, d.tokens), 0);

  return (
    <div
      className="min-w-64 p-2"
      style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
    >
      <div
        className="px-1 pb-1.5 text-[10px] uppercase tracking-wider"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Local activity · this machine
      </div>

      <ul className="flex flex-col gap-1">
        {byDay.map((day) => (
          <li key={day.date} className="flex items-center gap-2 px-1 text-[11px]">
            <span className="w-8 shrink-0" style={{ color: 'var(--color-text-muted)' }}>
              {dayLabel(day.date)}
            </span>
            <Progress
              value={maxDayTokens > 0 ? day.tokens / maxDayTokens : 0}
              fillColor="var(--color-accent)"
              aria-label={`${day.date}: ${formatTokens(day.tokens)} tokens, ${day.messages} messages`}
              trackClassName="h-1.5 flex-1"
            />
            <span
              className="w-12 shrink-0 text-right"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {formatTokens(day.tokens)}
            </span>
          </li>
        ))}
      </ul>

      <div className="my-2 h-px" style={{ background: 'var(--color-border)' }} />

      {byModel.length > 0 ? (
        <ul className="flex flex-col gap-0.5">
          {byModel.map((row) => (
            <li
              key={row.model}
              className="flex items-center justify-between gap-4 rounded px-1 py-0.5 text-[11px]"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <span className="truncate" style={{ color: 'var(--color-text-primary)' }}>
                {row.model}
              </span>
              <span className="shrink-0" style={{ color: 'var(--color-accent)' }}>
                {formatTokens(row.tokens)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="px-1 py-2 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          No local activity yet
        </div>
      )}
    </div>
  );
}
