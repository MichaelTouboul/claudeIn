// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

import type { SessionSummary } from "../../types/session.types";

// session.service derives the sessions base from HOME (see session.transcript's
// getProjectsBase). Point HOME at a temp dir and import the module dynamically
// per test so listSessions reads our fixture transcripts.
let tmpHome: string;
let prevHome: string | undefined;

beforeEach(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "cam-session-context-"));
  prevHome = process.env.HOME;
  process.env.HOME = tmpHome;
});

afterEach(() => {
  process.env.HOME = prevHome;
  fs.rmSync(tmpHome, { recursive: true, force: true });
});

const PROJECT_PATH = "/Users/x/ctx-project";

function sessionsDir(): string {
  const encoded = PROJECT_PATH.replace(/\//g, "-");
  return path.join(tmpHome, ".claude", "projects", encoded);
}

function userLine(branch?: string): string {
  return JSON.stringify({
    type: "user",
    promptId: "p1",
    timestamp: new Date().toISOString(),
    message: { content: "hello" },
    ...(branch ? { gitBranch: branch } : {}),
  });
}

function assistantLine(usage: Record<string, number>): string {
  return JSON.stringify({
    type: "assistant",
    timestamp: new Date().toISOString(),
    message: {
      model: "claude-x",
      content: [{ type: "text", text: "hi" }],
      usage,
    },
  });
}

function writeTranscript(id: string, lines: string[]): void {
  const dir = sessionsDir();
  fs.mkdirSync(dir, { recursive: true });
  // Prepend an interactive-metadata line so the fixture is treated as a real
  // session, not a one-shot `--print` helper transcript (which would be filtered).
  const metaLine = JSON.stringify({ type: "last-prompt", value: "hello" });
  fs.writeFileSync(path.join(dir, `${id}.jsonl`), [metaLine, ...lines].join("\n") + "\n", "utf-8");
}

describe("listSessions contextPercent", () => {
  it("derives contextPercent from the LAST assistant usage prompt tokens (EXCLUDING output)", async () => {
    const { listSessions } = await import("../session/session.service?fresh=ctx-last");
    // Last turn prompt: input 10_000 + cache_read 90_000 + cache_creation 0
    // = 100_000 of the 200_000 window → 50%. The 9_000 output_tokens MUST NOT
    // inflate the fill (they are the response, not the context prefix).
    writeTranscript("ctx", [
      userLine("main"),
      assistantLine({ input_tokens: 5_000, output_tokens: 200 }),
      assistantLine({
        input_tokens: 10_000,
        cache_read_input_tokens: 90_000,
        cache_creation_input_tokens: 0,
        output_tokens: 9_000,
      }),
    ]);

    const sessions = await listSessions(PROJECT_PATH);
    const s = sessions.find((x: SessionSummary) => x.sessionId === "ctx");
    expect(s?.contextPercent).toBe(50);
    expect(s?.branch).toBe("main");
  });

  it("reads a 1M-tier session (>200k prompt) against the 1M window, not a clamped 100", async () => {
    const { listSessions } = await import("../session/session.service?fresh=ctx-1m");
    // Ground-truth shape: a long Opus session whose prefix reached ~786k tokens
    // is on the 1M window → ~79%, NOT an aberrant clamp to 100% of 200k.
    writeTranscript("wide", [
      userLine(),
      assistantLine({
        input_tokens: 2,
        cache_read_input_tokens: 785_964,
        cache_creation_input_tokens: 938,
        output_tokens: 1_770,
      }),
    ]);

    const sessions = await listSessions(PROJECT_PATH);
    const s = sessions.find((x: SessionSummary) => x.sessionId === "wide");
    expect(s?.contextPercent).toBe(79);
  });

  it("caps contextPercent at 100 only for a genuinely over-full 1M context", async () => {
    const { listSessions } = await import("../session/session.service?fresh=ctx-cap");
    writeTranscript("big", [
      userLine(),
      assistantLine({ input_tokens: 1_200_000, output_tokens: 50_000 }),
    ]);

    const sessions = await listSessions(PROJECT_PATH);
    const s = sessions.find((x: SessionSummary) => x.sessionId === "big");
    expect(s?.contextPercent).toBe(100);
  });

  it("is null when no assistant usage is present, branch null when absent", async () => {
    const { listSessions } = await import("../session/session.service?fresh=ctx-none");
    writeTranscript("plain", [userLine()]);

    const sessions = await listSessions(PROJECT_PATH);
    const s = sessions.find((x: SessionSummary) => x.sessionId === "plain");
    expect(s?.contextPercent).toBeNull();
    expect(s?.branch).toBeNull();
  });
});
