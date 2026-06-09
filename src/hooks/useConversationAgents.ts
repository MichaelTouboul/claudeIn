import { dismissKey, useAgentDismissStore } from "@/store/useAgentDismissStore";
import { useDashboardStore } from "@/store/useDashboardStore";
import { AgentPresenceStatus, useEventsStore } from "@/store/useEventsStore";

// Re-export the store's presence enum under the hook's public name so callers
// (AgentTabs) keep a single import surface. There is ONE authoritative status
// type; this is an alias, not a parallel definition.
export const ConversationAgentStatus = AgentPresenceStatus;
export type ConversationAgentStatus = AgentPresenceStatus;

// Value → dot behavior, defined ONCE (CLAUDE.md: enum + behavior map, not a
// fallback chain). Only `active` pulses — a blinking dot must mean the agent is
// actually running (an event arrived within the 5s active window).
export const CONVERSATION_AGENT_DOT: Record<
  ConversationAgentStatus,
  { pulse: boolean }
> = {
  [ConversationAgentStatus.Active]: { pulse: true },
  [ConversationAgentStatus.Waiting]: { pulse: false },
  [ConversationAgentStatus.Idle]: { pulse: false },
};

export type ConversationAgent = {
  name: string;
  color: string;
  status: ConversationAgentStatus;
  // Latest event seq seen for this (session, agent). Passed to the dismiss store
  // on `×` so a later, strictly-newer event re-shows the tab.
  latestSeq: number;
};

// Deterministic palette for runtime agents that don't match a defined project
// agent (so they have no frontmatter color). Keys mirror the design-system
// color names accepted by `colorMap`, so the rendered dot stays on-palette.
const PALETTE = [
  "cyan",
  "blue",
  "green",
  "yellow",
  "orange",
  "red",
  "purple",
  "pink",
] as const;

// Canonical key for matching a runtime `agent_name` to a defined agent's
// `frontmatter.name` (AgentSummary.id). The backend's reported `agent_name` is
// not guaranteed to be byte-identical to the frontmatter name — casing or stray
// whitespace can differ — so we compare on a trimmed, lower-cased key rather than
// requiring an exact match (which would silently lose the configured color).
export function normalizeAgentKey(name: string): string {
  return name.trim().toLowerCase();
}

/** Stable name → palette color. Same name always yields the same color. */
export function paletteColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

/**
 * Sub-agents seen in THIS conversation, derived from the events store's DURABLE
 * session-scoped presence record (`useEventsStore.presence`).
 *
 * CORNERSTONE (session_id ↔ sub-agent linkage): `LiveEvent` carries the
 * `session_id` the hook reported. Claude Code runs Task-tool sub-agents inside
 * the parent conversation's session, so their hook events carry the PARENT
 * `session_id` — i.e. the conversation's `claudeSessionId`. The store records
 * presence keyed by that `session_id` on every `event` ingest, so this selector
 * just reads `presence.get(claudeSessionId)`. Two correctness properties follow:
 *   • Discovery survives the 200-event rolling buffer — presence is a separate
 *     durable Map, so a tab never silently vanishes when old events evict.
 *   • Status is per (session, agent) — an agent active in another conversation
 *     never makes this conversation's same-named agent pulse.
 * The orchestrator/main agent IS the conversation (its activity is the chat), so
 * it gets no tab and is excluded by name. If a future backend change tags
 * sub-agent events with their OWN session id instead, the store ingest is the
 * single place to revisit.
 *
 * Color is the defined project agent's frontmatter color when the runtime name
 * matches (compared via `normalizeAgentKey` — trimmed + lower-cased — so casing
 * or whitespace drift in the backend's `agent_name` doesn't lose the configured
 * color), else a deterministic palette hash.
 *
 * Dismiss (cosmetic, non-destructive): an agent dismissed via `×` is filtered out
 * while its latest event seq is `<=` the seq recorded at dismissal. It reappears
 * automatically once a strictly-newer event arrives (latest seq exceeds it) —
 * never stopping the agent, only hiding a stale tab until it's active again.
 */
export function useConversationAgents(
  claudeSessionId: string | null,
  orchestratorName: string,
): ConversationAgent[] {
  const sessionPresence = useEventsStore((s) =>
    claudeSessionId ? s.presence.get(claudeSessionId) : undefined,
  );
  const sessionSeq = useEventsStore((s) =>
    claudeSessionId ? s.presenceSeq.get(claudeSessionId) : undefined,
  );
  const dismissed = useAgentDismissStore((s) => s.dismissed);
  const definedAgents = useDashboardStore((s) => s.agents);

  if (!sessionPresence) return [];

  // Keyed by the NORMALIZED frontmatter name (AgentSummary.id) so a runtime
  // agent_name that differs only by casing/whitespace still resolves the color.
  const colorByName = new Map<string, string>();
  for (const agent of definedAgents) {
    if (agent.frontmatter.color) {
      colorByName.set(normalizeAgentKey(agent.id), agent.frontmatter.color);
    }
  }

  const result: ConversationAgent[] = [];
  for (const [name, status] of sessionPresence) {
    if (!name || normalizeAgentKey(name) === normalizeAgentKey(orchestratorName)) continue;
    const latestSeq = sessionSeq?.get(name) ?? -Infinity;
    // Cosmetic dismiss: hide the tab while NO strictly-newer event has arrived.
    // A `×` records the seq that was latest at dismissal; the tab reappears once
    // `latestSeq` exceeds it (the agent emitted again). Absent dismissal → show.
    const dismissedSeq = dismissed.get(dismissKey(claudeSessionId, name));
    if (dismissedSeq !== undefined && latestSeq <= dismissedSeq) continue;
    result.push({
      name,
      color: colorByName.get(normalizeAgentKey(name)) ?? paletteColor(name),
      status,
      latestSeq,
    });
  }
  return result;
}
