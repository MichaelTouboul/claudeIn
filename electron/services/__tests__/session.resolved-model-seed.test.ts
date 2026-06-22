// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

import {
  contextFillToPercent,
  findResolvedModelInFile,
  resolveContextWindow,
} from "../session/session.transcript";

vi.mock("electron", () => ({ BrowserWindow: { getAllWindows: () => [] } }));

// The live context-% watcher tails ONLY newly-appended transcript lines, so a
// `[1m]` resolvedModel marker written BEFORE the watch started was never seen —
// leaving the per-file window unpinned and mis-tiering a 1M session (~17% full)
// down to the 200k window (~85%). The fix seeds `fileResolvedModel` from a
// one-time initial scan of each existing file via `findResolvedModelInFile`.
let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cam-resolved-seed-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// A realistic transcript: the `[1m]` marker sits on an EARLY line (a tool result
// before any assistant usage turn), and the LAST assistant turn's prompt-side
// fill is < 200k (131 + 418 + 169178 = 169727) — exactly the shape that fools
// the by-fill tiering into the 200k window when the marker is missed.
function writeTranscript(file: string): void {
  const lines = [
    JSON.stringify({ type: "user", promptId: "p", message: { content: "hi" } }),
    JSON.stringify({ toolUseResult: { resolvedModel: "claude-opus-4-8[1m]" } }),
    JSON.stringify({
      type: "assistant",
      sessionId: "sess-1",
      message: {
        model: "claude-opus-4-8",
        usage: {
          input_tokens: 131,
          cache_creation_input_tokens: 418,
          cache_read_input_tokens: 169178,
          output_tokens: 200,
        },
      },
    }),
  ];
  fs.writeFileSync(file, lines.join("\n") + "\n", "utf-8");
}

describe("findResolvedModelInFile", () => {
  it("returns the [1m]-bearing resolvedModel even when its marker is on an early line", () => {
    const fp = path.join(tmpDir, "early-marker.jsonl");
    writeTranscript(fp);
    expect(findResolvedModelInFile(fp)).toBe("claude-opus-4-8[1m]");
  });

  it("returns the LAST resolvedModel found when several lines carry one", () => {
    const fp = path.join(tmpDir, "multi.jsonl");
    fs.writeFileSync(
      fp,
      [
        JSON.stringify({ toolUseResult: { resolvedModel: "claude-opus-4-8" } }),
        JSON.stringify({ toolUseResult: { resolvedModel: "claude-opus-4-8[1m]" } }),
      ].join("\n") + "\n",
      "utf-8",
    );
    expect(findResolvedModelInFile(fp)).toBe("claude-opus-4-8[1m]");
  });

  it("returns null when no line carries a resolvedModel", () => {
    const fp = path.join(tmpDir, "none.jsonl");
    fs.writeFileSync(
      fp,
      JSON.stringify({ type: "user", promptId: "p", message: { content: "hi" } }) + "\n",
      "utf-8",
    );
    expect(findResolvedModelInFile(fp)).toBeNull();
  });

  it("never throws on a missing file (returns null)", () => {
    expect(findResolvedModelInFile(path.join(tmpDir, "nope.jsonl"))).toBeNull();
  });

  it("never throws on malformed JSON lines (returns null)", () => {
    const fp = path.join(tmpDir, "malformed.jsonl");
    fs.writeFileSync(fp, "{ not valid json\n\n", "utf-8");
    expect(findResolvedModelInFile(fp)).toBeNull();
  });
});

describe("context-% math with vs without the [1m] marker (the bug)", () => {
  const fill = 131 + 418 + 169178; // 169727

  it("WITH the marker routes through the 1M window (~17%)", () => {
    expect(resolveContextWindow(fill, "claude-opus-4-8[1m]")).toBe(1_000_000);
    expect(contextFillToPercent(fill, "claude-opus-4-8[1m]")).toBe(17);
  });

  it("WITHOUT the marker mis-tiers to the 200k window (~85%) — documents the bug", () => {
    expect(resolveContextWindow(fill, null)).toBe(200_000);
    expect(contextFillToPercent(fill, null)).toBe(85);
  });
});

describe("startWatching — seeds fileResolvedModel from a pre-existing file", () => {
  let tmpHome: string;
  let prevHome: string | undefined;

  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "cam-seed-home-"));
    prevHome = process.env.HOME;
    process.env.HOME = tmpHome;
  });

  afterEach(() => {
    process.env.HOME = prevHome;
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  it("captures a [1m] marker that was written before the watch started", async () => {
    const watch = await import("../session/session.watch?fresh=seed-resolved");
    const projectPath = "/Users/x/repos/seed-project";
    const encoded = projectPath.replace(/\//g, "-");
    const dir = path.join(tmpHome, ".claude", "projects", encoded);
    fs.mkdirSync(dir, { recursive: true });
    const fp = path.join(dir, "sess-1.jsonl");
    writeTranscript(fp);

    watch.startWatching(projectPath);

    const seeded = watch.__peekResolvedModel() as Record<string, string>;
    expect(seeded[fp]).toBe("claude-opus-4-8[1m]");

    watch.stopWatching(projectPath);
  });
});
