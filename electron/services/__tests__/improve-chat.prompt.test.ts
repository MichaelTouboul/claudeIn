// @vitest-environment node
import { describe, expect, it } from "vitest";

import { improveChatPrompt } from "../prompts/improve-chat.prompt";
import { ImproveType } from "../../types/improve.types";

const build = improveChatPrompt.build;

describe("improveChatPrompt — machine-parsable recap contract", () => {
  it("instructs the assistant to END with the exact fenced recap block", () => {
    const prompt = build({
      type: ImproveType.Bug,
      transcript: [{ role: "user", text: "the send button disappears" }],
    });

    // The fenced recap fence + uppercase labels the parser keys on.
    expect(prompt).toContain("```recap");
    expect(prompt).toContain("TITLE:");
    expect(prompt).toContain("DESCRIPTION:");
    expect(prompt).toContain("ACCEPTANCE:");
    // Bullet shape for acceptance criteria.
    expect(prompt).toContain("- <criterion>");
  });

  it("asks for the same language as the user and keeps discussion-only", () => {
    const prompt = build({
      type: ImproveType.Feature,
      transcript: [{ role: "user", text: "ajoute un raccourci clavier" }],
    });

    const flat = prompt.toLowerCase().replace(/\s+/g, " ");
    expect(flat).toContain("same language");
    expect(flat).toContain("do not use tools");
    expect(flat).toContain("do not edit files");
  });

  it("appends a turn's absolute image paths into the rendered prompt", () => {
    const prompt = build({
      type: ImproveType.Design,
      transcript: [
        {
          role: "user",
          text: "make this header match the mock",
          images: ["/tmp/shot-1.png", "/tmp/shot-2.png"],
        },
      ],
    });

    expect(prompt).toContain("/tmp/shot-1.png");
    expect(prompt).toContain("/tmp/shot-2.png");
    // The user's text is still rendered alongside the paths.
    expect(prompt).toContain("make this header match the mock");
  });

  it("still embeds the request type and the running transcript", () => {
    const prompt = build({
      type: ImproveType.Performance,
      transcript: [
        { role: "user", text: "the list is laggy" },
        { role: "assistant", text: "which list?" },
      ],
    });

    expect(prompt.toLowerCase()).toContain("scoping");
    expect(prompt).toContain("the list is laggy");
    expect(prompt).toContain("which list?");
  });
});
