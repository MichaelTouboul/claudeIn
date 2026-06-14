// @vitest-environment node
import { describe, expect, it } from "vitest";

import { buildUserPrompt, parseNarrative } from "../search/user-search.narrative";

describe("parseNarrative", () => {
  it("parses a clean JSON object (happy path)", () => {
    const raw = JSON.stringify({
      name: "Ada Lovelace",
      role: "Backend engineer at Tastewise",
      summary: "A focused backend setup.",
      domains: ["backend", "infra"],
      workflow: "tdd",
    });

    expect(parseNarrative(raw)).toEqual({
      name: "Ada Lovelace",
      role: "Backend engineer at Tastewise",
      summary: "A focused backend setup.",
      domains: ["backend", "infra"],
      workflow: "tdd",
    });
  });

  it("extracts a ```json-fenced object preceded by prose", () => {
    const raw = [
      "I have enough to infer the setup. ```json",
      JSON.stringify({
        name: "Michael Touboul",
        role: "Full-stack engineer",
        summary: "Heavy CLI + agent user.",
        domains: ["frontend", "backend", "tooling"],
        workflow: "autonomous dev loops",
      }),
      "```",
    ].join("\n");

    expect(parseNarrative(raw)).toEqual({
      name: "Michael Touboul",
      role: "Full-stack engineer",
      summary: "Heavy CLI + agent user.",
      domains: ["frontend", "backend", "tooling"],
      workflow: "autonomous dev loops",
    });
  });

  it("extracts a bare object preceded by prose (no fence)", () => {
    const raw = `Here is what I found about the user:
${JSON.stringify({
      name: "Grace Hopper",
      role: "Compiler engineer",
      summary: "Nested object below should be ignored by balance scan.",
      domains: ["compilers"],
      workflow: "iterative",
    })}
Thanks!`;

    expect(parseNarrative(raw)).toEqual({
      name: "Grace Hopper",
      role: "Compiler engineer",
      summary: "Nested object below should be ignored by balance scan.",
      domains: ["compilers"],
      workflow: "iterative",
    });
  });

  it("handles a fenced object whose summary contains braces and quotes", () => {
    const raw = '```json\n{"name": "Nested", "role": null, "summary": "uses {a: 1} and \\"quotes\\"", "domains": [], "workflow": null}\n```';

    expect(parseNarrative(raw)).toEqual({
      name: "Nested",
      role: null,
      summary: 'uses {a: 1} and "quotes"',
      domains: [],
      workflow: null,
    });
  });

  it("falls back to summary-only on total garbage (name/role null)", () => {
    const raw = "I could not figure anything out, sorry — no JSON here.";

    expect(parseNarrative(raw)).toEqual({
      name: null,
      role: null,
      summary: "I could not figure anything out, sorry — no JSON here.",
      domains: [],
      workflow: null,
    });
  });

  it("returns a null summary on empty output", () => {
    expect(parseNarrative("   ")).toEqual({
      name: null,
      role: null,
      summary: null,
      domains: [],
      workflow: null,
    });
  });
});

describe("buildUserPrompt", () => {
  it("instructs the model to emit raw JSON with no fences or preamble", () => {
    const prompt = buildUserPrompt([]);
    expect(prompt).toContain("Output ONLY the raw JSON object");
    expect(prompt).toContain("no markdown code fences");
  });
});
