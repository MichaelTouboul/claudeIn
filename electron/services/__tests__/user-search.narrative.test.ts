// @vitest-environment node
import { describe, expect, it } from "vitest";

import { parseNarrative } from "../search/user-search.narrative";

describe("parseNarrative", () => {
  it("parses a clean JSON object (happy path)", () => {
    const raw = JSON.stringify({
      name: "Ada Lovelace",
      role: "TypeScript + Node, with PostgreSQL",
      domains: ["backend", "infra"],
    });

    expect(parseNarrative(raw)).toEqual({
      name: "Ada Lovelace",
      role: "TypeScript + Node, with PostgreSQL",
      domains: ["backend", "infra"],
    });
  });

  it("extracts a ```json-fenced object preceded by prose", () => {
    const raw = [
      "I have enough to infer the setup. ```json",
      JSON.stringify({
        name: "Michael Touboul",
        role: "TypeScript + React + Electron",
        domains: ["frontend", "backend", "tooling"],
      }),
      "```",
    ].join("\n");

    expect(parseNarrative(raw)).toEqual({
      name: "Michael Touboul",
      role: "TypeScript + React + Electron",
      domains: ["frontend", "backend", "tooling"],
    });
  });

  it("extracts a bare object preceded by prose (no fence)", () => {
    const raw = `Here is what I found about the user:
${JSON.stringify({
      name: "Grace Hopper",
      role: "C++ and compiler toolchains",
      domains: ["compilers"],
    })}
Thanks!`;

    expect(parseNarrative(raw)).toEqual({
      name: "Grace Hopper",
      role: "C++ and compiler toolchains",
      domains: ["compilers"],
    });
  });

  it("handles a fenced object whose role contains braces and quotes", () => {
    const raw =
      '```json\n{"name": "Nested", "role": "uses {a: 1} and \\"quotes\\"", "domains": []}\n```';

    expect(parseNarrative(raw)).toEqual({
      name: "Nested",
      role: 'uses {a: 1} and "quotes"',
      domains: [],
    });
  });

  it("falls back to an empty narrative on total garbage", () => {
    const raw = "I could not figure anything out, sorry — no JSON here.";

    expect(parseNarrative(raw)).toEqual({
      name: null,
      role: null,
      domains: [],
    });
  });

  it("returns an empty narrative on empty output", () => {
    expect(parseNarrative("   ")).toEqual({
      name: null,
      role: null,
      domains: [],
    });
  });
});
