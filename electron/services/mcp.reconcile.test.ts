// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  deriveTransport,
  reconcileMcp,
  SOURCE_PRECEDENCE,
  type SourceContribution,
} from "./mcp.reconcile";

describe("mcp.reconcile deriveTransport", () => {
  it("derives stdio from { command } (target = command)", () => {
    expect(deriveTransport({ command: "npx", args: ["-y", "x"] })).toEqual({
      transport: "stdio",
      target: "npx",
    });
  });

  it("derives sse from { url, type: 'sse' } (target = url)", () => {
    expect(deriveTransport({ url: "https://e.x/sse", type: "sse" })).toEqual({
      transport: "sse",
      target: "https://e.x/sse",
    });
  });

  it("derives http from { url, type: 'http' }", () => {
    expect(deriveTransport({ url: "https://e.x/mcp", type: "http" })).toEqual({
      transport: "http",
      target: "https://e.x/mcp",
    });
  });

  it("defaults a typeless url to http", () => {
    expect(deriveTransport({ url: "https://e.x/mcp" })).toEqual({
      transport: "http",
      target: "https://e.x/mcp",
    });
  });

  it("falls back to unknown for an unrecognized shape", () => {
    expect(deriveTransport({ foo: "bar" })).toEqual({ transport: "unknown", target: "" });
    expect(deriveTransport({})).toEqual({ transport: "unknown", target: "" });
  });
});

describe("mcp.reconcile reconcileMcp", () => {
  it("returns [] for empty input", () => {
    expect(reconcileMcp([])).toEqual([]);
  });

  it("locks precedence low→high: user-settings < user-global < project-mcp-json < project-settings", () => {
    expect([...SOURCE_PRECEDENCE]).toEqual([
      "user-settings",
      "user-global",
      "project-mcp-json",
      "project-settings",
    ]);
  });

  it("tags provenance + scope + derived transport/target per server", () => {
    const contributions: SourceContribution[] = [
      {
        source: "user-settings",
        scope: "user",
        servers: { a: { command: "node" }, b: { url: "https://x/sse", type: "sse" } },
      },
    ];
    const out = reconcileMcp(contributions);
    const a = out.find((s) => s.name === "a");
    const b = out.find((s) => s.name === "b");
    expect(a).toMatchObject({ source: "user-settings", scope: "user", transport: "stdio", target: "node", shadowed: false });
    expect(b).toMatchObject({ transport: "sse", target: "https://x/sse", shadowed: false });
  });

  it("higher-precedence source wins; lower kept marked shadowed", () => {
    const contributions: SourceContribution[] = [
      { source: "user-settings", scope: "user", servers: { dup: { command: "user-cmd" } } },
      { source: "project-settings", scope: "project", servers: { dup: { command: "proj-cmd" } } },
    ];
    const out = reconcileMcp(contributions);
    const userDup = out.find((s) => s.source === "user-settings" && s.name === "dup");
    const projDup = out.find((s) => s.source === "project-settings" && s.name === "dup");
    expect(userDup?.shadowed).toBe(true);
    expect(projDup?.shadowed).toBe(false);
    expect(projDup?.target).toBe("proj-cmd");
  });

  it("orders by precedence (low→high) regardless of input order, name-sorted within source", () => {
    const contributions: SourceContribution[] = [
      { source: "project-settings", scope: "project", servers: { z: { command: "z" }, a: { command: "a" } } },
      { source: "user-settings", scope: "user", servers: { m: { command: "m" } } },
    ];
    const out = reconcileMcp(contributions);
    expect(out.map((s) => `${s.source}:${s.name}`)).toEqual([
      "user-settings:m",
      "project-settings:a",
      "project-settings:z",
    ]);
  });

  it("skips non-object server configs", () => {
    const contributions: SourceContribution[] = [
      {
        source: "user-settings",
        scope: "user",
        servers: { ok: { command: "c" }, bad: null as unknown as Record<string, unknown> },
      },
    ];
    const out = reconcileMcp(contributions);
    expect(out.map((s) => s.name)).toEqual(["ok"]);
  });

  it("does not mutate the input contributions", () => {
    const contributions: SourceContribution[] = [
      { source: "user-settings", scope: "user", servers: { dup: { command: "u" } } },
      { source: "project-mcp-json", scope: "project", servers: { dup: { command: "p" } } },
    ];
    const snapshot = JSON.stringify(contributions);
    reconcileMcp(contributions);
    expect(JSON.stringify(contributions)).toBe(snapshot);
  });
});
