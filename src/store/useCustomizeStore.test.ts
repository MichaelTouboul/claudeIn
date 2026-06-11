import { beforeEach, describe, expect, it } from "vitest";

import type { McpServerEntry } from "@/types/mcp-mirror.types";

import { CustomizeSection, useCustomizeStore } from "./useCustomizeStore";

function entry(name: string): McpServerEntry {
  return {
    name,
    source: "user-settings",
    scope: "user",
    transport: "stdio",
    target: "cmd",
    shadowed: false,
  };
}

beforeEach(() => {
  useCustomizeStore.getState().reset();
});

describe("useCustomizeStore", () => {
  it("defaults to the Connectors section, no repo, no server", () => {
    const s = useCustomizeStore.getState();
    expect(s.section).toBe(CustomizeSection.Connectors);
    expect(s.repoScope).toBeNull();
    expect(s.selectedServer).toBeNull();
  });

  it("changing section clears the selected server", () => {
    useCustomizeStore.getState().selectServer(entry("a"));
    useCustomizeStore.getState().setSection(CustomizeSection.Skills);
    expect(useCustomizeStore.getState().section).toBe(CustomizeSection.Skills);
    expect(useCustomizeStore.getState().selectedServer).toBeNull();
  });

  it("changing repo scope clears the selected server", () => {
    useCustomizeStore.getState().selectServer(entry("a"));
    useCustomizeStore.getState().setRepoScope("/code/x");
    expect(useCustomizeStore.getState().repoScope).toBe("/code/x");
    expect(useCustomizeStore.getState().selectedServer).toBeNull();
  });

  it("reset restores the initial state", () => {
    useCustomizeStore.getState().setSection(CustomizeSection.Skills);
    useCustomizeStore.getState().setRepoScope("/code/x");
    useCustomizeStore.getState().selectServer(entry("a"));
    useCustomizeStore.getState().reset();
    const s = useCustomizeStore.getState();
    expect(s.section).toBe(CustomizeSection.Connectors);
    expect(s.repoScope).toBeNull();
    expect(s.selectedServer).toBeNull();
  });
});
