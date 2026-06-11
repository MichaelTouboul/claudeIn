// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

import { improveChat, setImproveChatRunner } from "./improve-chat.service";
import { ImproveType } from "../types/improve.types";

type ChatCall = { command: string; cwd: string; prompt: string };

let calls: ChatCall[];
let cannedStdout: string;
let tmpDir: string;

beforeEach(() => {
  calls = [];
  cannedStdout = "What part of the chat feels slow?";
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cam-improvechat-"));
  // Stub the spawn seam: record each invocation, return canned stdout. No real
  // `claude`/network is ever invoked in tests.
  setImproveChatRunner(async ({ command, cwd, prompt }) => {
    calls.push({ command, cwd, prompt });
    return cannedStdout;
  });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("improveChat", () => {
  it("runs claude --print and returns the runner's stdout as the reply", async () => {
    const reply = await improveChat({
      type: ImproveType.Performance,
      transcript: [{ role: "user", text: "The chat is slow" }],
    });

    expect(reply).toBe(cannedStdout);
    expect(calls).toHaveLength(1);
    expect(calls[0].command).toContain("claude");
    expect(calls[0].command).toContain("--print");
  });

  it("builds a scoping system prompt mentioning the request type and the transcript", async () => {
    await improveChat({
      type: ImproveType.Bug,
      transcript: [
        { role: "user", text: "Buttons disappear on hover" },
        { role: "assistant", text: "Which button?" },
        { role: "user", text: "The send button" },
      ],
    });

    const { prompt } = calls[0];
    expect(prompt.toLowerCase()).toContain("bug");
    expect(prompt.toLowerCase()).toContain("scoping");
    expect(prompt).toContain("Buttons disappear on hover");
    expect(prompt).toContain("The send button");
  });

  it("includes the component name + sourcePath in the prompt when present", async () => {
    await improveChat({
      type: ImproveType.Design,
      component: "Header",
      sourcePath: "src/components/Header/Header.tsx:10",
      transcript: [{ role: "user", text: "make it pop" }],
    });

    const { prompt } = calls[0];
    expect(prompt).toContain("Header");
    expect(prompt).toContain("src/components/Header/Header.tsx:10");
  });

  it("reads the source file from disk and embeds its contents when sourcePath points at a real file", async () => {
    const filePath = path.join(tmpDir, "Widget.tsx");
    const fileBody = "export function Widget() { return <div>UNIQUE_MARKER_42</div>; }";
    fs.writeFileSync(filePath, fileBody);

    await improveChat({
      type: ImproveType.Feature,
      component: "Widget",
      sourcePath: filePath,
      transcript: [{ role: "user", text: "add a close button" }],
    });

    expect(calls[0].prompt).toContain("UNIQUE_MARKER_42");
  });

  it("strips a trailing :line suffix from sourcePath before reading the file", async () => {
    const filePath = path.join(tmpDir, "Lined.tsx");
    fs.writeFileSync(filePath, "const X = 'LINE_SUFFIX_BODY';");

    await improveChat({
      type: ImproveType.Feature,
      component: "Lined",
      sourcePath: `${filePath}:128`,
      transcript: [{ role: "user", text: "tweak" }],
    });

    expect(calls[0].prompt).toContain("LINE_SUFFIX_BODY");
  });

  it("does not throw when sourcePath cannot be read; the prompt still builds", async () => {
    const reply = await improveChat({
      type: ImproveType.Feature,
      component: "Ghost",
      sourcePath: path.join(tmpDir, "does-not-exist.tsx"),
      transcript: [{ role: "user", text: "x" }],
    });

    expect(reply).toBe(cannedStdout);
    expect(calls[0].prompt).toContain("Ghost");
  });

  it("caps an oversized source file so the prompt stays bounded", async () => {
    const filePath = path.join(tmpDir, "Big.tsx");
    fs.writeFileSync(filePath, "A".repeat(50_000));

    await improveChat({
      type: ImproveType.Performance,
      sourcePath: filePath,
      transcript: [{ role: "user", text: "x" }],
    });

    // The embedded file content is capped well below its raw size.
    expect(calls[0].prompt.length).toBeLessThan(20_000);
  });
});
