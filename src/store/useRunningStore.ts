import { create } from "zustand";

type RunningState = {
  // Authoritative per-conversation running flag, keyed by claudeSessionId (the
  // on-disk `.jsonl` session id). Fed by AgentChat — the only place that knows
  // whether a SPECIFIC conversation's turn is in progress. The sidebar ACTIVITY
  // dot reads this instead of the agentName-keyed event sets (which can't tell
  // which of several same-agentName conversations is actually running).
  running: Record<string, boolean>;
  // Set the entry. Setting `false` is fine — we keep it simple and never delete,
  // so a finished/closed conversation reads `false`, not a stale `true`.
  setRunning: (claudeSessionId: string, running: boolean) => void;
};

export const useRunningStore = create<RunningState>((set) => ({
  running: {},

  setRunning: (claudeSessionId, running) =>
    set((s) => ({
      running: { ...s.running, [claudeSessionId]: running },
    })),
}));
