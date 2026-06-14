import { beforeEach, describe, expect, it } from "vitest";

import {
  ConversationStatus,
  STATUS_DOT,
  useConversationStatusStore,
} from "../useConversationStatusStore";

describe("useConversationStatusStore", () => {
  beforeEach(() => {
    useConversationStatusStore.setState({ statuses: {} });
  });

  it("records a status for a claudeSessionId", () => {
    useConversationStatusStore.getState().setStatus("sess-1", ConversationStatus.Running);
    expect(useConversationStatusStore.getState().statuses).toEqual({
      "sess-1": "running",
    });
  });

  it("overwrites an entry with the latest status", () => {
    useConversationStatusStore.getState().setStatus("sess-1", ConversationStatus.Running);
    useConversationStatusStore.getState().setStatus("sess-1", ConversationStatus.Idle);
    expect(useConversationStatusStore.getState().statuses["sess-1"]).toBe("idle");
  });

  it("keeps statuses for other conversations independent", () => {
    useConversationStatusStore.getState().setStatus("sess-1", ConversationStatus.Running);
    useConversationStatusStore.getState().setStatus("sess-2", ConversationStatus.Waiting);
    expect(useConversationStatusStore.getState().statuses).toEqual({
      "sess-1": "running",
      "sess-2": "waiting",
    });
  });

  it("maps each status value to a deterministic dot (only running pulses)", () => {
    expect(STATUS_DOT[ConversationStatus.Running]).toEqual({ color: "#22c55e", pulse: true });
    expect(STATUS_DOT[ConversationStatus.Waiting]).toEqual({ color: "#eab308", pulse: false });
    expect(STATUS_DOT[ConversationStatus.Idle]).toEqual({
      color: "var(--color-text-muted)",
      pulse: false,
    });
  });
});
