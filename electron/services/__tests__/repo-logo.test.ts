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
    expect(detectRepoLogo(root)?.startsWith("data:image/svg+xml;base64,")).toBe(true);
  });

  it("detects a logo inside an asset dir (public/) case-insensitively", () => {
    write("public/Logo.PNG", Buffer.from([0x89, 0x50]));
    expect(detectRepoLogo(root)?.startsWith("data:image/png;base64,")).toBe(true);
  });

  // --- Real-world cases from the empirical repo survey ---

  it("detects a nested monorepo client's favicon.ico (clients/* enumeration + .ico)", () => {
    write("clients/platform/src/favicon.ico", Buffer.from([0x00, 0x00, 0x01, 0x00]));
    expect(detectRepoLogo(root)?.startsWith("data:image/x-icon;base64,")).toBe(true);
  });

  it("prefers a nested logo.svg over a sibling favicon.ico in a CRA frontend", () => {
    write("frontend/public/favicon.ico", Buffer.from([0x00, 0x00, 0x01, 0x00]));
    write("frontend/src/logo.svg", "<svg></svg>");
    expect(detectRepoLogo(root)?.startsWith("data:image/svg+xml;base64,")).toBe(true);
  });

  it("detects docs/brand/logo-concept.svg (prefix name + nested docs/brand dir)", () => {
    write("docs/brand/logo-concept.svg", "<svg></svg>");
    expect(detectRepoLogo(root)?.startsWith("data:image/svg+xml;base64,")).toBe(true);
  });

  it("detects a numeric-suffix name (frontend/public/logo512.png)", () => {
    write("frontend/public/logo512.png", Buffer.from([0x89, 0x50]));
    expect(detectRepoLogo(root)?.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("detects apple-touch-icon.png", () => {
    write("public/apple-touch-icon.png", Buffer.from([0x89, 0x50]));
    expect(detectRepoLogo(root)?.startsWith("data:image/png;base64,")).toBe(true);
  });

  // --- Negative / boundary cases ---

  it("does NOT match a logout.png decoy (word boundary)", () => {
    write("public/logout.png", Buffer.from([0x89, 0x50]));
    expect(detectRepoLogo(root)).toBeNull();
  });

  it("skips files larger than the size cap (falls back to null)", () => {
    write("logo.png", Buffer.alloc(256 * 1024 + 1, 1));
    expect(detectRepoLogo(root)).toBeNull();
  });

  it("does not deep-walk an unlisted nested dir", () => {
    write("deep/nested/logo.svg", "<svg></svg>");
    expect(detectRepoLogo(root)).toBeNull();
  });
});
