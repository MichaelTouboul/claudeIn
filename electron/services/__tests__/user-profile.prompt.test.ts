// @vitest-environment node
import { describe, expect, it } from "vitest";

import { userProfilePrompt } from "../prompts/user-profile.prompt";

const build = userProfilePrompt.build;

describe("userProfilePrompt", () => {
  it("instructs the model to emit raw JSON with no fences or preamble", () => {
    const prompt = build([]);
    expect(prompt).toContain("Output ONLY the raw JSON object");
    expect(prompt).toContain("no markdown code fences");
  });

  it("asks role to describe technologies, not employer or monorepo", () => {
    const prompt = build([]);
    expect(prompt).toContain("technologies");
    expect(prompt).toContain("NOT their employer");
    expect(prompt).not.toContain('"summary"');
    expect(prompt).not.toContain('"workflow"');
  });

  it("asks for a stack array of individual technologies alongside role", () => {
    const prompt = build([]);
    expect(prompt).toContain('"stack"');
    // still keeps the prose role one-liner
    expect(prompt).toContain('"role"');
  });
});
