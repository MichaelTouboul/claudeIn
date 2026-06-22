// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

import { loadConversationSteps, summarizeToolInput } from "../session/session.steps";

let tmpHome: string;
let prevHome: string | undefined;
let sessionsDir: string;
const PROJECT = "/Users/me/proj";

beforeEach(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "cam-steps-"));
  prevHome = process.env.HOME;
  process.env.HOME = tmpHome;
  sessionsDir = path.join(tmpHome, ".claude", "projects", PROJECT.replace(/\//g, "-"));
  fs.mkdirSync(sessionsDir, { recursive: true });
});

afterEach(() => {
  process.env.HOME = prevHome;
  fs.rmSync(tmpHome, { recursive: true, force: true });
});

function assistantToolLine(opts: {
  ts: string;
  tools: Array<{ name: string; input: Record<string, unknown> }>;
}): string {
  return JSON.stringify({
    type: "assistant",
    timestamp: opts.ts,
    message: {
      content: opts.tools.map((t) => ({ type: "tool_use", name: t.name, input: t.input })),
    },
  });
}

function writeTranscript(sessionId: string, lines: string[]): void {
  fs.writeFileSync(path.join(sessionsDir, `${sessionId}.jsonl`), lines.join("\n"));
}

describe("loadConversationSteps", () => {
  it("emits ordered tool/target/ts for each tool_use block", () => {
    writeTranscript("s1", [
      JSON.stringify({ type: "user", message: { content: "hi" }, promptId: "p" }),
      assistantToolLine({
        ts: "2026-01-01T00:00:00Z",
        tools: [{ name: "Read", input: { file_path: "/a/b/social-trends.service.ts" } }],
      }),
      JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: "ok" }] } }),
      assistantToolLine({
        ts: "2026-01-01T00:01:00Z",
        tools: [
          { name: "Bash", input: { command: "npm run build" } },
          { name: "Edit", input: { file_path: "/x/y.ts" } },
        ],
      }),
    ]);

    const steps = loadConversationSteps(PROJECT, "s1");
    expect(steps).toEqual([
      { tool: "Read", target: "social-trends.service.ts", ts: "2026-01-01T00:00:00Z" },
      { tool: "Bash", target: "npm run build", ts: "2026-01-01T00:01:00Z" },
      { tool: "Edit", target: "y.ts", ts: "2026-01-01T00:01:00Z" },
    ]);
  });

  it("returns [] for a missing transcript", () => {
    expect(loadConversationSteps(PROJECT, "nope")).toEqual([]);
  });

  it("skips malformed lines without throwing", () => {
    writeTranscript("s2", [
      "{ not json",
      assistantToolLine({ ts: "t", tools: [{ name: "Glob", input: { pattern: "**/*.ts" } }] }),
    ]);
    expect(loadConversationSteps(PROJECT, "s2")).toEqual([
      { tool: "Glob", target: "**/*.ts", ts: "t" },
    ]);
  });
});

describe("summarizeToolInput", () => {
  it("basenames file_path tools", () => {
    for (const tool of ["Read", "Edit", "Write", "NotebookEdit"]) {
      expect(summarizeToolInput(tool, { file_path: "/deep/path/file.ts" })).toBe("file.ts");
    }
  });

  it("ellipsizes long Bash commands and keeps single line", () => {
    expect(summarizeToolInput("Bash", { command: "echo hi" })).toBe("echo hi");
    expect(summarizeToolInput("Bash", { command: "ls\n  -la" })).toBe("ls -la");
    const long = "x".repeat(60);
    expect(summarizeToolInput("Bash", { command: long })).toBe(`${"x".repeat(40)}…`);
  });

  it("returns pattern for Grep/Glob", () => {
    expect(summarizeToolInput("Grep", { pattern: "foo" })).toBe("foo");
    expect(summarizeToolInput("Glob", { pattern: "**/*.ts" })).toBe("**/*.ts");
  });

  it("returns host for WebFetch", () => {
    expect(summarizeToolInput("WebFetch", { url: "https://example.com/a/b" })).toBe("example.com");
  });

  it("returns description or subagent_type for Task", () => {
    expect(summarizeToolInput("Task", { description: "do thing" })).toBe("do thing");
    expect(summarizeToolInput("Task", { subagent_type: "feature-dev" })).toBe("feature-dev");
  });

  it("returns null for unknown tools or empty input", () => {
    expect(summarizeToolInput("Unknown", { foo: "bar" })).toBeNull();
    expect(summarizeToolInput("Read", {})).toBeNull();
    expect(summarizeToolInput("Bash", { command: "   " })).toBeNull();
  });
});
