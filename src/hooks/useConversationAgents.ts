import { useDashboardStore } from "@/store/useDashboardStore";
import { useEventsStore } from "@/store/useEventsStore";
import type { LiveEvent } from "@/types/events.types";

// Finite presence state for a sub-agent in a conversation. Authoritative source
// of truth (CLAUDE.md: enum + behavior map, not a fallback chain). `idle` also
// stands in for the unknown/absent case (an agent seen in the conversation's
// events but in neither the active nor waiting set).
export const ConversationAgentStatus = {
  Active: "active",
  Waiting: "waiting",
  Idle: "idle",
} as const;
export type ConversationAgentStatus =
  (typeof ConversationAgentStatus)[keyof typeof ConversationAgentStatus];

// Value → dot behavior, defined ONCE. Only `active` pulses — a blinking dot must
// mean the agent is actually running (event within the 5s active window).
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

/** Stable name → palette color. Same name always yields the same color. */
export function paletteColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function statusFor(
  name: string,
  active: Set<string>,
  waiting: Set<string>,
): ConversationAgentStatus {
  if (active.has(name)) return ConversationAgentStatus.Active;
  if (waiting.has(name)) return ConversationAgentStatus.Waiting;
  return ConversationAgentStatus.Idle;
}

/**
 * Sub-agents seen in THIS conversation, derived from existing events.
 *
 * CORNERSTONE (session_id ↔ sub-agent linkage): `LiveEvent` carries the
 * `session_id` the hook reported. Claude Code runs Task-tool sub-agents inside
 * the parent conversation's session, so their hook events carry the PARENT
 * `session_id` — i.e. the conversation's `claudeSessionId`. We therefore scope
 * by filtering the retained `events[]` (each keeps its per-event `session_id`)
 * rather than the by-name aggregate sets, which drop it. The orchestrator/main
 * agent IS the conversation (its activity is the chat), so it gets no tab and is
 * excluded by name. If a future backend change tags sub-agent events with their
 * OWN session id instead, this selector is the single place to revisit.
 *
 * Status comes from the by-name `activeAgents`/`waitingAgents` sets; color is
 * the defined project agent's frontmatter color when the runtime name matches,
 * else a deterministic palette hash.
 */
export function useConversationAgents(
  claudeSessionId: string | null,
  orchestratorName: string,
): ConversationAgent[] {
  const events = useEventsStore((s) => s.events);
  const active = useEventsStore((s) => s.activeAgents);
  const waiting = useEventsStore((s) => s.waitingAgents);
  const definedAgents = useDashboardStore((s) => s.agents);

  if (!claudeSessionId) return [];

  const colorByName = new Map<string, string>();
  for (const agent of definedAgents) {
    if (agent.frontmatter.color) colorByName.set(agent.id, agent.frontmatter.color);
  }

  const seen = new Set<string>();
  const result: ConversationAgent[] = [];
  for (const event of events as LiveEvent[]) {
    if (event.session_id !== claudeSessionId) continue;
    const name = event.agent_name;
    if (!name || name === orchestratorName) continue;
    if (seen.has(name)) continue;
    seen.add(name);
    result.push({
      name,
      color: colorByName.get(name) ?? paletteColor(name),
      status: statusFor(name, active, waiting),
    });
  }
  return result;
}
