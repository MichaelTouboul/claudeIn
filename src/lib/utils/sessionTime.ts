/**
 * Relative-time bucketing + labels for the Sessions sidebar. Buckets are keyed
 * off the LOCAL calendar day (so "Today"/"Yesterday" match the user's wall
 * clock), while the short label is a recency glyph: "now"/"15m"/"2h" within the
 * last day, an "HH:MM" clock time for yesterday, a weekday within the previous
 * week, and a "DD/MM" date for anything older.
 */

export const SessionTimeBucket = {
  Today: "Today",
  Yesterday: "Yesterday",
  Previous7Days: "Previous 7 days",
  Older: "Older",
} as const;
export type SessionTimeBucket = (typeof SessionTimeBucket)[keyof typeof SessionTimeBucket];

/** Ordered for rendering — time groups always appear in this sequence. */
export const SESSION_TIME_BUCKET_ORDER: SessionTimeBucket[] = [
  SessionTimeBucket.Today,
  SessionTimeBucket.Yesterday,
  SessionTimeBucket.Previous7Days,
  SessionTimeBucket.Older,
];

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Whole local-calendar days between two instants (`now` minus the row's day). */
function calendarDaysAgo(then: Date, now: Date): number {
  const startThen = new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime();
  const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((startNow - startThen) / DAY_MS);
}

export function sessionTimeBucket(iso: string | null, nowMs: number = Date.now()): SessionTimeBucket {
  if (!iso) return SessionTimeBucket.Older;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return SessionTimeBucket.Older;
  const days = calendarDaysAgo(new Date(t), new Date(nowMs));
  if (days <= 0) return SessionTimeBucket.Today;
  if (days === 1) return SessionTimeBucket.Yesterday;
  if (days <= 7) return SessionTimeBucket.Previous7Days;
  return SessionTimeBucket.Older;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function sessionTimeLabel(iso: string | null, nowMs: number = Date.now()): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const ageMs = nowMs - t;
  const d = new Date(t);
  const days = calendarDaysAgo(d, new Date(nowMs));

  // Today → compact recency glyph ("now"/"15m"/"2h"). Keyed off the calendar day
  // (not a 24h window) so a row that buckets as Yesterday never borrows it.
  if (days <= 0 && ageMs >= 0) {
    const minutes = Math.floor(ageMs / 60_000);
    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h`;
  }

  // Yesterday → a clock time so the exact moment stays legible.
  if (days === 1) return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  // Previous week → the weekday name.
  if (days <= 7) return WEEKDAYS[d.getDay()];
  // Older → a short date.
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
}
