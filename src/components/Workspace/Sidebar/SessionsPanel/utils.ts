import type { SessionSummary } from "@/hooks/useSessions";

export type SessionTiers = {
  live: SessionSummary[];
  recent: SessionSummary[];
  older: SessionSummary[];
};

/**
 * Partition scope-filtered sessions into the three sidebar tiers.
 *
 * - `live`: derived status `live`, OR ClaudeIn is actively driving the session
 *   (its agent is in `activeAgents`) — the precise live signal beyond the mtime
 *   snapshot.
 * - `recent`: derived status `recent` (and not promoted to live).
 * - `older`: everything else (`idle`) — surfaced via the "Load more" modal.
 */
export function partitionSessions(
  sessions: SessionSummary[],
  activeAgents: Set<string>
): SessionTiers {
  const live: SessionSummary[] = [];
  const recent: SessionSummary[] = [];
  const older: SessionSummary[] = [];

  for (const s of sessions) {
    const driven = s.agentName !== null && activeAgents.has(s.agentName);
    if (s.status === "live" || driven) {
      live.push(s);
    } else if (s.status === "recent") {
      recent.push(s);
    } else {
      older.push(s);
    }
  }

  return { live, recent, older };
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
