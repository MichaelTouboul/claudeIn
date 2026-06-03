import type { SessionSummary } from "@/hooks/useSessions";

export type SessionTiers = {
  live: SessionSummary[];
  recent: SessionSummary[];
  older: SessionSummary[];
  archived: SessionSummary[];
};

/**
 * Partition scope-filtered sessions into the sidebar tiers. (Soft-deleted
 * sessions are filtered out server-side and never reach here.)
 *
 * - `archived`: any archived session, regardless of status — kept OUT of the
 *   live/recent/older tiers and surfaced in the Load-more modal's archived view.
 * - `live`: derived status `live`, OR ClaudeIn is actively driving the session
 *   (its agent is in `activeAgents`) — the precise live signal beyond the mtime
 *   snapshot.
 * - `recent`: derived status `recent` (and not promoted to live).
 * - `older`: everything else (`idle`) — surfaced via the "Load more" modal.
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
  const older: SessionSummary[] = [];
  const archived: SessionSummary[] = [];

  for (const s of sessions) {
    if (s.archived) {
      archived.push(s);
      continue;
    }
    const driven = s.agentName !== null && activeAgents.has(s.agentName);
    if (s.status === "live" || driven) {
      live.push(s);
    } else if (s.status === "recent") {
      recent.push(s);
    } else {
      older.push(s);
    }
  }

  return { live, recent, older, archived };
}

export type LiveActivity = "running" | "waiting" | "idle";

/**
 * Running/waiting voyant state for a live row. Per reserve 2, `waiting` is only
 * reliable for ClaudeIn-piloted sessions (`waitingAgents`); a non-piloted live
 * session can only be shown as appending, not "waiting for input".
 */
export function liveActivity(
  session: SessionSummary,
  activeAgents: Set<string>,
  waitingAgents: Set<string>
): LiveActivity {
  const name = session.agentName;
  if (name !== null && waitingAgents.has(name)) return "waiting";
  if (name !== null && activeAgents.has(name)) return "running";
  return session.status === "live" ? "running" : "idle";
}

export function shortModel(model: string | null): string | null {
  if (!model) return null;
  return model.split("-").pop() ?? model;
}
