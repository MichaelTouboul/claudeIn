import type { SessionSummary } from "@/hooks/useSessions";
import { SESSION_TIME_BUCKET_ORDER, sessionTimeBucket } from "@/lib/utils";
import { effectivePinned } from "@/store/dashboard/usePinnedStore";

export const PINNED_GROUP_LABEL = "Pinned";

export type SessionGroup = {
  label: string;
  sessions: SessionSummary[];
};

/**
 * Build the ordered Sessions-sidebar groups from the raw session list:
 *
 * - A title `query` filter (case-insensitive, matches the coalesced display
 *   title or the first prompt) is applied first.
 * - Effectively-pinned sessions (override-aware) float to a single "Pinned"
 *   group above the time groups; they are NOT duplicated into a time group.
 * - Everything else is bucketed by relative time (Today / Yesterday /
 *   Previous 7 days / Older) and each group is sorted most-recent first.
 *
 * Empty groups are dropped so the renderer only walks groups with rows.
 */
export function groupSessions(
  sessions: SessionSummary[],
  overrides: Record<string, boolean>,
  query: string,
  nowMs: number = Date.now(),
): SessionGroup[] {
  const q = query.trim().toLowerCase();
  const matches = (s: SessionSummary): boolean => {
    if (!q) return true;
    const hay = `${s.title ?? ""} ${s.firstPrompt ?? ""}`.toLowerCase();
    return hay.includes(q);
  };

  const pinned: SessionSummary[] = [];
  const byBucket = new Map<string, SessionSummary[]>();

  for (const s of sessions) {
    if (!matches(s)) continue;
    if (effectivePinned(overrides, s.sessionId, s.pinned)) {
      pinned.push(s);
      continue;
    }
    const bucket = sessionTimeBucket(s.lastActiveAt, nowMs);
    const arr = byBucket.get(bucket) ?? [];
    arr.push(s);
    byBucket.set(bucket, arr);
  }

  const byRecency = (a: SessionSummary, b: SessionSummary): number =>
    (b.lastActiveAt ?? "").localeCompare(a.lastActiveAt ?? "");

  // Pinned: oldest pin first (stable), recency as the tiebreak.
  pinned.sort((a, b) => {
    if (a.pinnedAt && b.pinnedAt) return a.pinnedAt.localeCompare(b.pinnedAt);
    if (a.pinnedAt) return -1;
    if (b.pinnedAt) return 1;
    return byRecency(a, b);
  });

  const groups: SessionGroup[] = [];
  if (pinned.length > 0) groups.push({ label: PINNED_GROUP_LABEL, sessions: pinned });

  for (const bucket of SESSION_TIME_BUCKET_ORDER) {
    const arr = byBucket.get(bucket);
    if (arr && arr.length > 0) groups.push({ label: bucket, sessions: arr.slice().sort(byRecency) });
  }

  return groups;
}
