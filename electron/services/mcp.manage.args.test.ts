// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildMcpAddArgs } from "./mcp.manage.args";

describe("buildMcpAddArgs — stdio", () => {
  it("builds `mcp add --scope <s> <name> -- <command> <args...>`", () => {
    expect(
      buildMcpAddArgs({
        name: "pw",
        scope: "local",
        transport: "stdio",
        command: "npx",
        args: ["-y", "@playwright/mcp"],
      }),
    ).toEqual([
      "mcp",
      "add",
      "--scope",
      "local",
      "pw",
      "--",
      "npx",
      "-y",
      "@playwright/mcp",
    ]);
  });

  it("emits one `--env K=V` per env entry (before the `--` separator)", () => {
    expect(
      buildMcpAddArgs({
        name: "pw",
        scope: "local",
        transport: "stdio",
        command: "npx",
        env: { API_KEY: "x" },
      }),
    ).toEqual(["mcp", "add", "--scope", "local", "--env", "API_KEY=x", "pw", "--", "npx"]);
  });

  it("omits the args tail when no args are given", () => {
    expect(
      buildMcpAddArgs({
        name: "srv",
        scope: "user",
        transport: "stdio",
        command: "my-bin",
      }),
    ).toEqual(["mcp", "add", "--scope", "user", "srv", "--", "my-bin"]);
  });
});

describe("buildMcpAddArgs — http/sse", () => {
  it("builds `mcp add --scope <s> --transport http <name> <url> --header 'K: V'`", () => {
    expect(
      buildMcpAddArgs({
        name: "gh",
        scope: "user",
        transport: "http",
        url: "https://api/mcp",
        headers: { Authorization: "Bearer t" },
      }),
    ).toEqual([
      "mcp",
      "add",
      "--scope",
      "user",
      "--transport",
      "http",
      "gh",
      "https://api/mcp",
      "--header",
      "Authorization: Bearer t",
    ]);
  });

  it("supports sse transport with no headers", () => {
    expect(
      buildMcpAddArgs({
        name: "stream",
        scope: "project",
        transport: "sse",
        url: "https://e.x/sse",
      }),
    ).toEqual([
      "mcp",
      "add",
      "--scope",
      "project",
      "--transport",
      "sse",
      "stream",
      "https://e.x/sse",
    ]);
  });
});

describe("buildMcpAddArgs — validation", () => {
  it("rejects an empty name", () => {
    expect(() =>
      buildMcpAddArgs({ name: "", scope: "user", transport: "stdio", command: "x" }),
    ).toThrow(/name/i);
  });

  it("rejects a whitespace-containing name", () => {
    expect(() =>
      buildMcpAddArgs({ name: "bad name", scope: "user", transport: "stdio", command: "x" }),
    ).toThrow(/name/i);
  });

  it("rejects stdio without a command", () => {
    expect(() =>
      buildMcpAddArgs({ name: "srv", scope: "user", transport: "stdio" }),
    ).toThrow(/command/i);
  });

  it("rejects http without a url", () => {
    expect(() =>
      buildMcpAddArgs({ name: "srv", scope: "user", transport: "http" }),
    ).toThrow(/url/i);
  });

  it("rejects sse without a url", () => {
    expect(() =>
      buildMcpAddArgs({ name: "srv", scope: "user", transport: "sse" }),
    ).toThrow(/url/i);
  });
});
