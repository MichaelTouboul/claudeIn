// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { detectRepoLanguage } from "../projects/repo-language";

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cam-repo-lang-"));
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

function touch(rel: string, content = ""): void {
  const abs = path.join(tmp, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}

describe("detectRepoLanguage — manifest-first", () => {
  it("tsconfig.json → TypeScript", () => {
    touch("tsconfig.json", "{}");
    touch("package.json", "{}");
    expect(detectRepoLanguage(tmp)).toBe("TypeScript");
  });

  it("package.json without tsconfig → JavaScript", () => {
    touch("package.json", "{}");
    expect(detectRepoLanguage(tmp)).toBe("JavaScript");
  });

  it("pyproject.toml → Python", () => {
    touch("pyproject.toml", "");
    expect(detectRepoLanguage(tmp)).toBe("Python");
  });

  it("requirements.txt → Python", () => {
    touch("requirements.txt", "");
    expect(detectRepoLanguage(tmp)).toBe("Python");
  });

  it("go.mod → Go", () => {
    touch("go.mod", "");
    expect(detectRepoLanguage(tmp)).toBe("Go");
  });

  it("Cargo.toml → Rust", () => {
    touch("Cargo.toml", "");
    expect(detectRepoLanguage(tmp)).toBe("Rust");
  });

  it("pom.xml → Java", () => {
    touch("pom.xml", "");
    expect(detectRepoLanguage(tmp)).toBe("Java");
  });

  it("Gemfile → Ruby", () => {
    touch("Gemfile", "");
    expect(detectRepoLanguage(tmp)).toBe("Ruby");
  });

  it("composer.json → PHP", () => {
    touch("composer.json", "{}");
    expect(detectRepoLanguage(tmp)).toBe("PHP");
  });
});

describe("detectRepoLanguage — extension fallback", () => {
  it("falls back to the most common source extension when no manifest", () => {
    touch("a.py");
    touch("b.py");
    touch("c.js");
    expect(detectRepoLanguage(tmp)).toBe("Python");
  });

  it("counts TypeScript files via extension", () => {
    touch("main.ts");
    touch("other.ts");
    touch("only.go");
    expect(detectRepoLanguage(tmp)).toBe("TypeScript");
  });
});

describe("detectRepoLanguage — undetectable", () => {
  it("returns null for an empty repo", () => {
    expect(detectRepoLanguage(tmp)).toBeNull();
  });

  it("returns null for a non-existent path", () => {
    expect(detectRepoLanguage(path.join(tmp, "nope"))).toBeNull();
  });

  it("returns null when only unknown files exist", () => {
    touch("README.md");
    touch("LICENSE");
    expect(detectRepoLanguage(tmp)).toBeNull();
  });
});
