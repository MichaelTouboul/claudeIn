// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { detectRepoLogo } from "../projects/repo-logo";

let root = "";

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "repo-logo-"));
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

function write(rel: string, bytes: Buffer | string): void {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, bytes);
}

describe("detectRepoLogo", () => {
  it("returns null when no logo file exists", () => {
    expect(detectRepoLogo(root)).toBeNull();
  });

  it("reads a root-level logo.svg as a data URL with the svg MIME", () => {
    write("logo.svg", "<svg></svg>");
    const url = detectRepoLogo(root);
    expect(url).not.toBeNull();
    expect(url?.startsWith("data:image/svg+xml;base64,")).toBe(true);
  });

  it("detects a logo inside an asset dir (public/) case-insensitively", () => {
    write("public/Logo.PNG", Buffer.from([0x89, 0x50]));
    const url = detectRepoLogo(root);
    expect(url?.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("detects public/favicon.svg", () => {
    write("public/favicon.svg", "<svg></svg>");
    expect(detectRepoLogo(root)?.startsWith("data:image/svg+xml;base64,")).toBe(true);
  });

  it("skips files larger than the size cap", () => {
    write("logo.png", Buffer.alloc(256 * 1024 + 1, 1));
    expect(detectRepoLogo(root)).toBeNull();
  });

  it("does not deep-walk (a nested non-listed dir is ignored)", () => {
    write("deep/nested/logo.svg", "<svg></svg>");
    expect(detectRepoLogo(root)).toBeNull();
  });
});
