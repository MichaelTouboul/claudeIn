// @vitest-environment node
import { describe, expect, it } from "vitest";
import { detectImports, firstNonEmptyLine } from "../memory/memory.summarize";

describe("memory.summarize firstNonEmptyLine", () => {
  it("returns the first non-empty trimmed line", () => {
    expect(firstNonEmptyLine("\n   \n# Title\nbody")).toBe("# Title");
  });

  it("returns empty string when there is no non-empty line", () => {
    expect(firstNonEmptyLine("\n   \n\t\n")).toBe("");
    expect(firstNonEmptyLine("")).toBe("");
  });

  it("caps a very long line", () => {
    const long = "x".repeat(500);
    expect(firstNonEmptyLine(long).length).toBe(200);
  });
});

describe("memory.summarize detectImports", () => {
  it("detects a leading @path import line", () => {
    expect(detectImports("# Title\n@./other.md\nmore")).toBe(true);
    expect(detectImports("@~/.claude/shared.md")).toBe(true);
  });

  it("ignores a mid-line @ (e.g. an email)", () => {
    expect(detectImports("Contact me at user@example.com")).toBe(false);
  });

  it("returns false when there is no import directive", () => {
    expect(detectImports("# Title\njust prose")).toBe(false);
    expect(detectImports("")).toBe(false);
  });
});
