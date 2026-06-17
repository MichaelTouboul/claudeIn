// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// session.transcript reads HOME at call time to resolve the projects base, so
// set it before importing the service (mirrors profile.service.test.ts).
const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "cam-phantom-"));
process.env.HOME = tmpHome;

const session = await import("../session/session.service");
const { isPhantomHelperTranscript } = await import("../session/session.phantom");

const projectPath = "/Users/dev/myrepo";
let sessionsDir: string;

function encode(p: string): string {
  return p.replace(/\//g, "-");
}

function writeTranscript(sessionId: string, lines: Record<string, unknown>[]): void {
  const body = lines.map((l) => JSON.stringify(l)).join("\n") + "\n";
  fs.writeFileSync(path.join(sessionsDir, `${sessionId}.jsonl`), body);
}

function userLine(content: string): Record<string, unknown> {
  return {
    type: "user",
    promptId: "p-" + Math.random().toString(36).slice(2),
    message: { content },
    timestamp: new Date().toISOString(),
  };
}

function assistantLine(text: string): Record<string, unknown> {
  return {
    type: "assistant",
    message: { model: "claude-opus-4-8", content: [{ type: "text", text }] },
    timestamp: new Date().toISOString(),
  };
}

beforeAll(() => {
  sessionsDir = path.join(tmpHome, ".claude", "projects", encode(projectPath));
});

afterAll(() => {
  fs.rmSync(tmpHome, { recursive: true, force: true });
});

beforeEach(() => {
  fs.rmSync(sessionsDir, { recursive: true, force: true });
  fs.mkdirSync(sessionsDir, { recursive: true });
});

describe("listSessions phantom filtering", () => {
  it("excludes a one-shot repo-label helper transcript", async () => {
    writeTranscript("repo-label-1", [
      userLine("In one short sentence, describe what this repository is and does, based on its `.claude` setup."),
      assistantLine("It is a CLI tool."),
    ]);

    const summaries = await session.listSessions(projectPath);
    expect(summaries.map((s) => s.sessionId)).not.toContain("repo-label-1");
  });

  it("excludes a one-shot scope-profile helper transcript", async () => {
    writeTranscript("scope-profile-1", [
      userLine("Below is a plain-text snapshot of a Claude Code setup's `.claude` directory."),
      assistantLine("## Profile"),
    ]);

    const summaries = await session.listSessions(projectPath);
    expect(summaries.map((s) => s.sessionId)).not.toContain("scope-profile-1");
  });

  it("excludes a generic one-shot (single user turn, only user+assistant types)", async () => {
    writeTranscript("generic-oneshot", [
      userLine("Do a one-off thing that is not a known internal prompt at all."),
      assistantLine("Done."),
    ]);

    const summaries = await session.listSessions(projectPath);
    expect(summaries.map((s) => s.sessionId)).not.toContain("generic-oneshot");
  });

  it("keeps a real interactive session that begins with interactive-metadata lines", async () => {
    writeTranscript("interactive-1", [
      { type: "last-prompt", value: "hi" },
      { type: "mode", value: "default" },
      { type: "permission-mode", value: "ask" },
      userLine("hello"),
      assistantLine("Hi there."),
    ]);

    const summaries = await session.listSessions(projectPath);
    expect(summaries.map((s) => s.sessionId)).toContain("interactive-1");
  });

  it("keeps a real session with multiple user turns even without metadata lines", async () => {
    writeTranscript("multi-turn", [
      userLine("hello"),
      assistantLine("Hi."),
      userLine("another normal question"),
      assistantLine("An answer."),
    ]);

    const summaries = await session.listSessions(projectPath);
    expect(summaries.map((s) => s.sessionId)).toContain("multi-turn");
  });
});

describe("isPhantomHelperTranscript predicate", () => {
  it("returns true for no-metadata + a single user turn (structural)", () => {
    expect(
      isPhantomHelperTranscript({
        types: new Set(["user", "assistant"]),
        userTurnCount: 1,
        firstUserPrompt: "anything not internal",
      })
    ).toBe(true);
  });

  it("returns false when an interactive metadata type is present, even with 1 turn", () => {
    expect(
      isPhantomHelperTranscript({
        types: new Set(["last-prompt", "user", "assistant"]),
        userTurnCount: 1,
        firstUserPrompt: "anything",
      })
    ).toBe(false);
  });

  it("returns false for multiple user turns + no metadata + non-internal prompt", () => {
    expect(
      isPhantomHelperTranscript({
        types: new Set(["user", "assistant"]),
        userTurnCount: 3,
        firstUserPrompt: "a normal question",
      })
    ).toBe(false);
  });

  it("returns true when the first prompt matches a known internal prompt, regardless of turns", () => {
    expect(
      isPhantomHelperTranscript({
        types: new Set(["user", "assistant"]),
        userTurnCount: 5,
        firstUserPrompt: "You are labeling a conversation. Output ONLY a short topic label.",
      })
    ).toBe(true);
  });
});
