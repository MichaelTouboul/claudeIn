// @vitest-environment node
import { describe, expect, it } from "vitest";

import { buildTransformPrompt, TransformKind } from "../transform/transform.prompt";

describe("buildTransformPrompt", () => {
  it("embeds both the instruction and the source content", () => {
    const prompt = buildTransformPrompt({
      kind: TransformKind.Text,
      instruction: "make it formal",
      content: "yo what's up",
    });
    expect(prompt).toContain("make it formal");
    expect(prompt).toContain("yo what's up");
    expect(prompt).toContain("<instruction>");
    expect(prompt).toContain("<source>");
  });

  it("instructs the model to return a markdown table for the table kind", () => {
    const prompt = buildTransformPrompt({
      kind: TransformKind.Table,
      instruction: "add a total column",
      content: "| a | b |\n|---|---|\n| 1 | 2 |",
    });
    expect(prompt.toLowerCase()).toContain("markdown table");
  });

  it("forbids code fences for the code kind", () => {
    const prompt = buildTransformPrompt({
      kind: TransformKind.Code,
      instruction: "rename foo to bar",
      content: "const foo = 1;",
    });
    expect(prompt.toLowerCase()).toContain("no markdown code fences");
  });

  it("is deterministic — same input yields the same string", () => {
    const input = { kind: TransformKind.Text, instruction: "x", content: "y" } as const;
    expect(buildTransformPrompt(input)).toBe(buildTransformPrompt(input));
  });

  it("trims surrounding whitespace from the instruction", () => {
    const prompt = buildTransformPrompt({
      kind: TransformKind.Text,
      instruction: "  spaced  ",
      content: "c",
    });
    expect(prompt).toContain("<instruction>\nspaced\n</instruction>");
  });
});
