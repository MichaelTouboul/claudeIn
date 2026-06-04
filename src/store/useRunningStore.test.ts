import { beforeEach, describe, expect, it } from "vitest";

import { useRunningStore } from "./useRunningStore";

describe("useRunningStore", () => {
  beforeEach(() => {
    useRunningStore.setState({ running: {} });
  });

  it("records a running flag for a claudeSessionId", () => {
    useRunningStore.getState().setRunning("sess-1", true);
    expect(useRunningStore.getState().running).toEqual({ "sess-1": true });
  });

  it("flips an entry back to false (kept as false, not deleted)", () => {
    useRunningStore.getState().setRunning("sess-1", true);
    useRunningStore.getState().setRunning("sess-1", false);
    expect(useRunningStore.getState().running["sess-1"]).toBe(false);
  });

  it("keeps running flags for other conversations independent", () => {
    useRunningStore.getState().setRunning("sess-1", true);
    useRunningStore.getState().setRunning("sess-2", false);
    expect(useRunningStore.getState().running).toEqual({ "sess-1": true, "sess-2": false });
  });
});
