// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import {
  addServer,
  editServer,
  getServerRaw,
  removeServer,
  setMcpCliRunner,
  type McpCliInvocation,
  type McpCliResult,
} from "../mcp/mcp.manage";
import type { McpAddInput } from "../../types/mcp-manage.types";

let calls: McpCliInvocation[];
let queued: McpCliResult[];

// Stub the spawn seam: record every `claude mcp` invocation (argv + cwd) and
// return a queued canned result (stdout/stderr/exit). No real `claude` runs.
function queue(result: McpCliResult): void {
  queued.push(result);
}

beforeEach(() => {
  calls = [];
  queued = [];
  setMcpCliRunner(async (invocation) => {
    calls.push(invocation);
    return queued.shift() ?? { stdout: "", stderr: "", exitCode: 0 };
  });
});

const STDIO_INPUT: McpAddInput = {
  name: "pw",
  scope: "user",
  transport: "stdio",
  command: "npx",
  args: ["-y", "@playwright/mcp"],
};

describe("addServer", () => {
  it("spawns `claude` with buildMcpAddArgs(input); zero exit → { ok: true }", async () => {
    queue({ stdout: "Added", stderr: "", exitCode: 0 });

    const result = await addServer(STDIO_INPUT);

    expect(result).toEqual({ ok: true });
    expect(calls).toHaveLength(1);
    expect(calls[0].args).toEqual([
      "mcp",
      "add",
      "--scope",
      "user",
      "pw",
      "--",
      "npx",
      "-y",
      "@playwright/mcp",
    ]);
  });

  it("non-zero exit → { ok: false, error: <stderr> }", async () => {
    queue({ stdout: "", stderr: "server already exists", exitCode: 1 });

    const result = await addServer(STDIO_INPUT);

    expect(result).toEqual({ ok: false, error: "server already exists" });
  });

  it("project/local scope runs with cwd = projectPath", async () => {
    queue({ stdout: "", stderr: "", exitCode: 0 });

    await addServer({
      name: "local-srv",
      scope: "local",
      projectPath: "/home/me/proj",
      transport: "stdio",
      command: "my-bin",
    });

    expect(calls[0].cwd).toBe("/home/me/proj");
  });
});

describe("removeServer", () => {
  it("spawns `claude mcp remove <name> --scope <scope>`", async () => {
    queue({ stdout: "Removed", stderr: "", exitCode: 0 });

    const result = await removeServer("gh", "user");

    expect(result).toEqual({ ok: true });
    expect(calls).toHaveLength(1);
    expect(calls[0].args).toEqual(["mcp", "remove", "gh", "--scope", "user"]);
  });

  it("non-zero exit surfaces stderr", async () => {
    queue({ stdout: "", stderr: "no such server", exitCode: 2 });

    expect(await removeServer("nope", "user")).toEqual({
      ok: false,
      error: "no such server",
    });
  });

  it("project scope runs with cwd = projectPath", async () => {
    queue({ stdout: "", stderr: "", exitCode: 0 });

    await removeServer("gh", "project", "/home/me/proj");

    expect(calls[0].cwd).toBe("/home/me/proj");
  });
});

describe("editServer", () => {
  it("performs remove then add (in order)", async () => {
    queue({ stdout: "Removed", stderr: "", exitCode: 0 });
    queue({ stdout: "Added", stderr: "", exitCode: 0 });

    const result = await editServer("pw", STDIO_INPUT);

    expect(result).toEqual({ ok: true });
    expect(calls).toHaveLength(2);
    expect(calls[0].args).toEqual(["mcp", "remove", "pw", "--scope", "user"]);
    expect(calls[1].args[0]).toBe("mcp");
    expect(calls[1].args[1]).toBe("add");
  });

  it("aborts (no add) when remove fails, surfacing the remove error", async () => {
    queue({ stdout: "", stderr: "remove failed", exitCode: 1 });

    const result = await editServer("pw", STDIO_INPUT);

    expect(result).toEqual({ ok: false, error: "remove failed" });
    expect(calls).toHaveLength(1);
  });

  it("surfaces the add error when add fails after a successful remove", async () => {
    queue({ stdout: "Removed", stderr: "", exitCode: 0 });
    queue({ stdout: "", stderr: "add failed", exitCode: 1 });

    const result = await editServer("pw", STDIO_INPUT);

    expect(result).toEqual({ ok: false, error: "add failed" });
    expect(calls).toHaveLength(2);
  });
});

const GET_SAMPLE = `pw:
  Scope: User config (available in all your projects)
  Status: ✓ Connected
  Type: stdio
  Command: npx
  Args: -y @playwright/mcp
  Environment:
    API_KEY=secret
    REGION=eu
`;

const GET_HTTP_SAMPLE = `gh:
  Scope: User config (available in all your projects)
  Type: http
  URL: https://api.example/mcp
  Headers:
    Authorization: Bearer t
`;

describe("getServerRaw", () => {
  it("spawns `claude mcp get <name>` and parses stdio output", async () => {
    queue({ stdout: GET_SAMPLE, stderr: "", exitCode: 0 });

    const raw = await getServerRaw("pw");

    expect(calls[0].args).toEqual(["mcp", "get", "pw"]);
    expect(raw).toEqual({
      name: "pw",
      transport: "stdio",
      scope: "user",
      command: "npx",
      args: ["-y", "@playwright/mcp"],
      env: { API_KEY: "secret", REGION: "eu" },
    });
  });

  it("parses http output into url + headers", async () => {
    queue({ stdout: GET_HTTP_SAMPLE, stderr: "", exitCode: 0 });

    const raw = await getServerRaw("gh");

    expect(raw).toEqual({
      name: "gh",
      transport: "http",
      scope: "user",
      url: "https://api.example/mcp",
      headers: { Authorization: "Bearer t" },
    });
  });

  it("project scope runs with cwd = projectPath", async () => {
    queue({ stdout: GET_SAMPLE, stderr: "", exitCode: 0 });

    await getServerRaw("pw", "project", "/home/me/proj");

    expect(calls[0].cwd).toBe("/home/me/proj");
  });

  it("throws on a non-zero exit, surfacing stderr", async () => {
    queue({ stdout: "", stderr: "No MCP server found", exitCode: 1 });

    await expect(getServerRaw("nope")).rejects.toThrow(/No MCP server found/);
  });
});
