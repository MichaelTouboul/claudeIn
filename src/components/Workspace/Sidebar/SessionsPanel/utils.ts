import type { SessionSummary } from "@/hooks/useSessions";

export type SessionTiers = {
  live: SessionSummary[];
  recent: SessionSummary[];
  archived: SessionSummary[];
};

/**
 * Partition scope-filtered sessions into the sidebar tiers. (Soft-deleted
 * sessions are filtered out server-side and never reach here.)
 *
 * - `archived`: any archived session, regardless of status — kept OUT of the
 *   live/recent tiers and surfaced in the Load-more modal's archived view.
 * - `live`: derived status `live`, OR ClaudeIn is actively driving the session
 *   (its agent is in `activeAgents`) — the precise live signal beyond the mtime
 *   snapshot. Live sessions are ALWAYS shown inline (never capped).
 * - `recent`: every other non-archived session (derived status `recent` or
 *   `idle`) — the full non-live history, later split by `capRecent` into the
 *   inline cap and the Load-more overflow.
 *
 * Input order is preserved within each tier, so the backend's pinned-first sort
 * carries through (pinned rows lead their tier).
 */
export function partitionSessions(
  sessions: SessionSummary[],
  activeAgents: Set<string>
): SessionTiers {
  const live: SessionSummary[] = [];
  const recent: SessionSummary[] = [];
  const archived: SessionSummary[] = [];

  for (const s of sessions) {
    if (s.archived) {
      archived.push(s);
      continue;
    }
    const driven = s.agentName !== null && activeAgents.has(s.agentName);
    if (s.status === "live" || driven) {
      live.push(s);
    } else {
      recent.push(s);
    }
  }

  return { live, recent, archived };
}

export type CappedRecent = {
  inline: SessionSummary[];
  overflow: SessionSummary[];
};

/**
 * Cap the non-live recent history to the `limit` most recent sessions shown
 * inline; everything beyond the cap spills into `overflow` (surfaced in the
 * Load-more modal). Input order — the backend pinned-first sort — is preserved,
 * so the first `limit` entries are the most recent / pinned-leading rows.
 */
export function capRecent(sessions: SessionSummary[], limit = 10): CappedRecent {
  return {
    inline: sessions.slice(0, limit),
    overflow: sessions.slice(limit),
  };
}

export function shortModel(model: string | null): string | null {
  if (!model) return null;
  return model.split("-").pop() ?? model;
}
