import { beforeEach, describe, expect, it } from "vitest";

import { effectivePinned, usePinnedStore } from "../usePinnedStore";

describe("usePinnedStore", () => {
  beforeEach(() => {
    usePinnedStore.setState({ overrides: {} });
  });

  it("records an optimistic pin override", () => {
    usePinnedStore.getState().setPinned("sess-1", true);
    expect(usePinnedStore.getState().overrides).toEqual({ "sess-1": true });
  });

  it("records an optimistic unpin override (false, not delete)", () => {
    usePinnedStore.getState().setPinned("sess-1", true);
    usePinnedStore.getState().setPinned("sess-1", false);
    expect(usePinnedStore.getState().overrides["sess-1"]).toBe(false);
  });

  it("keeps overrides for other sessions independent", () => {
    usePinnedStore.getState().setPinned("sess-1", true);
    usePinnedStore.getState().setPinned("sess-2", false);
    expect(usePinnedStore.getState().overrides).toEqual({ "sess-1": true, "sess-2": false });
  });
});

describe("effectivePinned", () => {
  it("falls back to the DB flag when there is no override", () => {
    expect(effectivePinned({}, "sess-1", true)).toBe(true);
    expect(effectivePinned({}, "sess-1", false)).toBe(false);
  });

  it("lets the override win over the DB flag (both directions)", () => {
    expect(effectivePinned({ "sess-1": true }, "sess-1", false)).toBe(true);
    expect(effectivePinned({ "sess-1": false }, "sess-1", true)).toBe(false);
  });
});
