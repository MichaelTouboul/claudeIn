// @vitest-environment node
import { describe, expect, it } from "vitest";

import { PROMPTS, PromptId } from "../prompts";

describe("prompt registry", () => {
  const ids = Object.values(PromptId);

  it("contains an entry for every PromptId", () => {
    expect(Object.keys(PROMPTS).sort()).toEqual([...ids].sort());
  });

  it.each(ids)("entry %s is well-formed (id matches key, version, build)", (id) => {
    const prompt = PROMPTS[id];
    expect(prompt).toBeDefined();
    expect(prompt.id).toBe(id);
    expect(Number.isInteger(prompt.version)).toBe(true);
    expect(prompt.version).toBeGreaterThan(0);
    expect(typeof prompt.build).toBe("function");
  });

  it("renders a representative prompt's known contract markers", () => {
    // The panel-transform prompt's table contract is a stable, known substring.
    const out = PROMPTS[PromptId.PanelTransform].build({
      kind: "table",
      instruction: "x",
      content: "y",
    });
    expect(out.toLowerCase()).toContain("markdown table");
  });
});
