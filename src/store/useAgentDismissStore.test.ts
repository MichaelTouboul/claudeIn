import { beforeEach, describe, expect, it } from "vitest";

import {
  dismissKey,
  useAgentDismissStore,
} from "./useAgentDismissStore";

beforeEach(() => {
  useAgentDismissStore.setState({ dismissed: new Map() });
});

describe("useAgentDismissStore", () => {
  it("records the dismissed seq keyed by (session, agent)", () => {
    useAgentDismissStore.getState().dismiss("sess-1", "researcher", 5);
    const { dismissed } = useAgentDismissStore.getState();
    expect(dismissed.get(dismissKey("sess-1", "researcher"))).toBe(5);
  });

  it("keys distinctly per session so the same agent name does not collide", () => {
    useAgentDismissStore.getState().dismiss("sess-A", "researcher", 2);
    useAgentDismissStore.getState().dismiss("sess-B", "researcher", 7);
    const { dismissed } = useAgentDismissStore.getState();
    expect(dismissed.get(dismissKey("sess-A", "researcher"))).toBe(2);
    expect(dismissed.get(dismissKey("sess-B", "researcher"))).toBe(7);
  });

  it("clones the map on dismiss (new reference) so selectors re-render", () => {
    const before = useAgentDismissStore.getState().dismissed;
    useAgentDismissStore.getState().dismiss("sess-1", "x", 1);
    const after = useAgentDismissStore.getState().dismissed;
    expect(after).not.toBe(before);
  });

  it("overwrites a prior dismissal for the same key with the new seq", () => {
    useAgentDismissStore.getState().dismiss("sess-1", "x", 1);
    useAgentDismissStore.getState().dismiss("sess-1", "x", 4);
    expect(
      useAgentDismissStore.getState().dismissed.get(dismissKey("sess-1", "x")),
    ).toBe(4);
  });

  it("builds a stable key for a null session id", () => {
    expect(dismissKey(null, "x")).toBe("::x");
    expect(dismissKey("s", "x")).toBe("s::x");
  });
});
