// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildRepoLabelContext } from "../projects/repo-context";

const tmpDirs: string[] = [];

function makeTmpRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "repo-context-"));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tmpDirs.length > 0) {
    const dir = tmpDirs.pop();
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("buildRepoLabelContext", () => {
  it("includes top-level files, a CLAUDE.md excerpt, and .claude/ contents", () => {
    const dir = makeTmpRepo();
    fs.writeFileSync(path.join(dir, "package.json"), "{}");
    fs.writeFileSync(path.join(dir, "CLAUDE.md"), "This repo does WIDGET things.");
    fs.mkdirSync(path.join(dir, ".claude", "agents"), { recursive: true });
    fs.writeFileSync(path.join(dir, ".claude", "settings.json"), "{}");

    const context = buildRepoLabelContext(dir);

    expect(typeof context).toBe("string");
    expect(context).toContain("Top-level files:");
    expect(context).toContain("package.json");
    expect(context).toContain("CLAUDE.md (excerpt):");
    expect(context).toContain("WIDGET things");
    expect(context).toContain(".claude/ contents:");
    expect(context).toContain("settings.json");
  });

  it("excludes node_modules and .git from the top-level listing", () => {
    const dir = makeTmpRepo();
    fs.mkdirSync(path.join(dir, "node_modules"));
    fs.mkdirSync(path.join(dir, ".git"));
    fs.writeFileSync(path.join(dir, "index.ts"), "export {};");

    const context = buildRepoLabelContext(dir);

    expect(context).toContain("index.ts");
    expect(context).not.toContain("node_modules");
    expect(context).not.toContain(".git");
  });

  it("returns a string and never throws for a non-existent path", () => {
    const missing = path.join(os.tmpdir(), "definitely-not-a-real-repo-xyz-123");
    let context = "";
    expect(() => {
      context = buildRepoLabelContext(missing);
    }).not.toThrow();
    expect(typeof context).toBe("string");
  });
});
