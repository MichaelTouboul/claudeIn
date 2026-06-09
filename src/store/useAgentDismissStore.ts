import { create } from "zustand";

// Cosmetic per-(conversation, sub-agent) dismissal. Dismissing an agent tab is
// NON-DESTRUCTIVE — it never stops the agent. We record the latest event `seq`
// (monotonic `LiveEvent.id`) seen for that agent AT THE MOMENT of dismissal; the
// tab is hidden only while no STRICTLY-NEWER event has arrived. As soon as the
// agent emits an event with a greater seq, the tab reappears. State is keyed by
// the (session, agent) pair so dismissing in one conversation never hides the
// same-named agent in another.
export type DismissedSeqMap = Map<string, number>;

/** Canonical key for the (session, agent) pair. */
export function dismissKey(
  claudeSessionId: string | null,
  agentName: string,
): string {
  return `${claudeSessionId ?? ""}::${agentName}`;
}

type AgentDismissState = {
  // (session::agent) → the seq that was the latest when the user dismissed it.
  dismissed: DismissedSeqMap;
  /** Record a dismissal at the agent's current latest seq for this session. */
  dismiss: (
    claudeSessionId: string | null,
    agentName: string,
    seq: number,
  ) => void;
};

export const useAgentDismissStore = create<AgentDismissState>((set) => ({
  dismissed: new Map(),
  dismiss: (claudeSessionId, agentName, seq) =>
    set((s) => {
      const next: DismissedSeqMap = new Map(s.dismissed);
      next.set(dismissKey(claudeSessionId, agentName), seq);
      return { dismissed: next };
    }),
}));
