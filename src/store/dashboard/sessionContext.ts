import type { SessionPresence } from "@/store/dashboard/useEventsStore";

/**
 * Backend context % for one agent: the max percent among the sessions where the
 * agent is currently present (an agent name may appear in several conversations).
 * Returns null when no present session has a backend percent yet — surfaces then
 * omit the bar rather than guessing.
 *
 * The percent itself is NEVER computed here. It is the one backend value
 * (`session_context`, keyed by claudeSessionId) the store holds in
 * `sessionContexts`; this helper only selects which session's value an agent row
 * should show, so the live agent bar mirrors the sidebar row for that session.
 */
export function contextPercentForAgent(
  presence: SessionPresence,
  sessionContexts: Map<string, number>,
  agentName: string,
): number | null {
  let best: number | null = null;
  for (const [sessionId, inner] of presence) {
    if (!inner.has(agentName)) continue;
    const percent = sessionContexts.get(sessionId);
    if (percent === undefined) continue;
    best = best === null ? percent : Math.max(best, percent);
  }
  return best;
}
