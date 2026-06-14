import type { LiveEvent } from "@/lib/types";
import { AgentPresenceStatus, useEventsStore } from "@/store/useEventsStore";

import { buildSegments } from "./useSessionWorkflow.segments";

// One tool-span on an agent's Timeline lane (derived; see buildSegments).
export type WorkflowSegment = { tool: string | null; startMs: number; endMs: number };

// Per-agent run data for ONE session, derived live from useEventsStore. `status`
// comes from the durable presence record; `tool` is the agent's latest event's
// tool; tokens/cost are summed over its events in the rolling buffer; `segments`
// are the tool-spans for the Timeline; `latestSeq` orders agents most-recent-first.
export type WorkflowAgent = {
  agentName: string;
  status: AgentPresenceStatus;
  tool: string | null;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  segments: WorkflowSegment[];
  latestSeq: number;
};

/**
 * Derive the per-agent run data for one conversation's session, live from
 * `useEventsStore`. Selector-based (CLAUDE.md): subscribes to `presence`,
 * `presenceSeq`, and `events` so a newer ingest re-renders consumers.
 *
 * Scoping: presence is the authoritative, durable, session-keyed source of which
 * agents appeared in this conversation (it survives the 200-event buffer). The
 * events buffer (also session-scoped) supplies the latest tool, token totals, and
 * the Timeline segments. An agent in another session never leaks in because both
 * the presence map and the per-event `session_id` filter are session-keyed.
 *
 * Status is read straight from presence; `?? AgentPresenceStatus.Idle` is the
 * genuine ABSENT case only (an agent with events but no presence entry) — never a
 * primary derivation. Agents are sorted by `latestSeq` descending (most recent
 * first). A `null` session id yields `[]`.
 */
export function useSessionWorkflow(claudeSessionId: string | null): WorkflowAgent[] {
  const sessionPresence = useEventsStore((s) =>
    claudeSessionId ? s.presence.get(claudeSessionId) : undefined,
  );
  const sessionSeq = useEventsStore((s) =>
    claudeSessionId ? s.presenceSeq.get(claudeSessionId) : undefined,
  );
  const events = useEventsStore((s) => s.events);

  if (!claudeSessionId || !sessionPresence) return [];

  return assembleWorkflowAgents(claudeSessionId, sessionPresence, sessionSeq, events);
}

// Pure assembly of the WorkflowAgent[] from the selected store slices. Kept out
// of the hook body so the hook stays a thin selector layer and the math is
// independently testable.
function assembleWorkflowAgents(
  claudeSessionId: string,
  sessionPresence: Map<string, AgentPresenceStatus>,
  sessionSeq: Map<string, number> | undefined,
  events: LiveEvent[],
): WorkflowAgent[] {
  // Bucket this session's events by agent (the buffer is newest-first; group then
  // let buildSegments re-sort by id so order is independent of buffer ordering).
  const eventsByAgent = new Map<string, LiveEvent[]>();
  for (const event of events) {
    if (event.session_id !== claudeSessionId) continue;
    const bucket = eventsByAgent.get(event.agent_name);
    if (bucket) bucket.push(event);
    else eventsByAgent.set(event.agent_name, [event]);
  }

  const result: WorkflowAgent[] = [];
  for (const [agentName, presenceStatus] of sessionPresence) {
    const agentEvents = eventsByAgent.get(agentName) ?? [];
    const latest = latestEvent(agentEvents);
    let tokensIn = 0;
    let tokensOut = 0;
    let costUsd = 0;
    for (const event of agentEvents) {
      tokensIn += event.tokens_in;
      tokensOut += event.tokens_out;
      costUsd += event.cost_usd;
    }
    result.push({
      agentName,
      // Genuine absent case only — presence drives status, never a fallback chain.
      status: presenceStatus ?? AgentPresenceStatus.Idle,
      tool: latest?.tool_name ?? null,
      tokensIn,
      tokensOut,
      costUsd,
      segments: buildSegments(agentEvents),
      latestSeq: sessionSeq?.get(agentName) ?? -Infinity,
    });
  }

  return result.sort((a, b) => b.latestSeq - a.latestSeq);
}

// The agent's most recent event by `id` (monotonic), or null if it has none in
// the rolling buffer.
function latestEvent(events: LiveEvent[]): LiveEvent | null {
  let latest: LiveEvent | null = null;
  for (const event of events) {
    if (latest === null || event.id > latest.id) latest = event;
  }
  return latest;
}
