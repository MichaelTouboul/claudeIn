// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

import type { SessionSummary } from "../../types/session.types";

// The decisive regression: a project whose `.claude` model ends in `[1m]` must
// make every session in it resolve against the 1M window — EVEN when the
// transcript carries NO `toolUseResult.resolvedModel` marker (the real-world
// case: that field is never populated). A 178_030-token fill must read as 18%
// of 1M, not 89% of a mis-tiered 200k window.
//
// session.service derives the sessions base from HOME (getProjectsBase). We put
// the project dir itself UNDER the temp HOME so both the project's `.claude`
// settings and the encoded transcript dir live in a controlled temp location.
let tmpHome: string;
let projectPath: string;
let prevHome: string | undefined;

beforeEach(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "cam-proj-window-"));
  prevHome = process.env.HOME;
  process.env.HOME = tmpHome;
  projectPath = path.join(tmpHome, "repos", "my-1m-project");
  fs.mkdirSync(projectPath, { recursive: true });
});

afterEach(() => {
  process.env.HOME = prevHome;
  fs.rmSync(tmpHome, { recursive: true, force: true });
});

function sessionsDir(): string {
  const encoded = projectPath.replace(/\//g, "-");
  return path.join(tmpHome, ".claude", "projects", encoded);
}

function writeProjectModel(model: string): void {
  const claudeDir = path.join(projectPath, ".claude");
  fs.mkdirSync(claudeDir, { recursive: true });
  fs.writeFileSync(path.join(claudeDir, "settings.json"), JSON.stringify({ model }), "utf-8");
}

function writeTranscript(id: string, lines: string[]): void {
  const dir = sessionsDir();
  fs.mkdirSync(dir, { recursive: true });
  const metaLine = JSON.stringify({ type: "last-prompt", value: "hello" });
  fs.writeFileSync(path.join(dir, `${id}.jsonl`), [metaLine, ...lines].join("\n") + "\n", "utf-8");
}

function userLine(): string {
  return JSON.stringify({
    type: "user",
    promptId: "p1",
    timestamp: new Date().toISOString(),
    message: { content: "hello" },
  });
}

// 178_030 fill, NO toolUseResult.resolvedModel marker (the field is absent in
// practice). input 30 + cache_read 178_000 = 178_030.
function assistantLine178k(): string {
  return JSON.stringify({
    type: "assistant",
    timestamp: new Date().toISOString(),
    message: {
      model: "claude-opus-4-8",
      content: [{ type: "text", text: "hi" }],
      usage: { input_tokens: 30, cache_read_input_tokens: 178_000, output_tokens: 500 },
    },
  });
}

describe("listSessions — project .claude model is the window source of truth", () => {
  it("a [1m] project model makes a 178_030 fill read as 18% (not 89%) with NO transcript marker", async () => {
    const { listSessions } = await import("../session/session.service?fresh=pw-1m");
    writeProjectModel("claude-opus-4-8[1m]");
    writeTranscript("opus1m", [userLine(), assistantLine178k()]);

    const sessions = await listSessions(projectPath);
    const s = sessions.find((x: SessionSummary) => x.sessionId === "opus1m");
    expect(s?.contextPercent).toBe(18);
  });

  it("WITHOUT a [1m] project model, the same fill keeps the old 200k-tier behavior (89%)", async () => {
    const { listSessions } = await import("../session/session.service?fresh=pw-200k");
    writeProjectModel("claude-opus-4-8");
    writeTranscript("opus200k", [userLine(), assistantLine178k()]);

    const sessions = await listSessions(projectPath);
    const s = sessions.find((x: SessionSummary) => x.sessionId === "opus200k");
    expect(s?.contextPercent).toBe(89);
  });
});
