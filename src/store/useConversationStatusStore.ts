import { create } from "zustand";

// Explicit per-conversation status, keyed by claudeSessionId. Each value maps
// deterministically to a dot appearance (see STATUS_DOT) — no fallback chain.
// AgentChat is the sole writer: it is the only place that knows whether a
// SPECIFIC conversation's turn is in progress (running), waiting on the user
// (waiting), or settled (idle). The sidebar ACTIVITY dot reads this per id
// instead of the agentName-keyed event sets (which can't tell which of several
// same-agentName conversations is actually running).
export const ConversationStatus = {
  Running: "running",
  Waiting: "waiting",
  Idle: "idle",
} as const;
export type ConversationStatus =
  (typeof ConversationStatus)[keyof typeof ConversationStatus];

// Behavior-per-value, defined ONCE. Only `running` pulses — a blinking dot must
// mean the turn is actually running. `waiting` is a steady yellow; `idle` is the
// muted resting dot (also the fallback for an unknown/absent id).
export const STATUS_DOT: Record<
  ConversationStatus,
  { color: string; pulse: boolean }
> = {
  [ConversationStatus.Running]: { color: "#22c55e", pulse: true },
  [ConversationStatus.Waiting]: { color: "#eab308", pulse: false },
  [ConversationStatus.Idle]: { color: "var(--color-text-muted)", pulse: false },
};

type ConversationStatusState = {
  // Per-conversation status, keyed by claudeSessionId. An absent id reads as
  // idle at the call site (the single `?? 'idle'` fallback).
  statuses: Record<string, ConversationStatus>;
  setStatus: (claudeSessionId: string, status: ConversationStatus) => void;
};

export const useConversationStatusStore = create<ConversationStatusState>(
  (set) => ({
    statuses: {},

    setStatus: (claudeSessionId, status) =>
      set((s) => ({
        statuses: { ...s.statuses, [claudeSessionId]: status },
      })),
  }),
);
