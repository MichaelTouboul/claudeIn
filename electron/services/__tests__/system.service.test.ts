// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

const { openPathMock } = vi.hoisted(() => ({ openPathMock: vi.fn<(p: string) => Promise<string>>() }));
vi.mock("electron", () => ({ shell: { openPath: openPathMock } }));

import { getAppVersion, openPath, readVersionFromPackageJson } from "../system/system.service";

describe("getAppVersion", () => {
  it("returns the version declared in the repo package.json", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8"),
    ) as { version: string };

    expect(getAppVersion()).toBe(pkg.version);
  });

  it("matches the baseline 0.1.0 semver shape", () => {
    expect(getAppVersion()).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe("readVersionFromPackageJson", () => {
  it("reads the version field of a given package.json file", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cam-version-"));
    const file = path.join(dir, "package.json");
    fs.writeFileSync(file, JSON.stringify({ name: "x", version: "1.2.3" }), "utf-8");

    expect(readVersionFromPackageJson(file)).toBe("1.2.3");

    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("falls back to 0.0.0 when the file is missing or unparseable", () => {
    expect(readVersionFromPackageJson(path.join(os.tmpdir(), "nope-package.json"))).toBe("0.0.0");
  });
});

describe("openPath", () => {
  beforeEach(() => openPathMock.mockReset());

  it("returns an error for an empty path without touching shell", async () => {
    expect(await openPath("")).toMatch(/no path/i);
    expect(openPathMock).not.toHaveBeenCalled();
  });

  it("returns a not-found error for a missing path without touching shell", async () => {
    const missing = path.join(os.tmpdir(), "cam-openpath-missing-xyz.md");
    expect(await openPath(missing)).toMatch(/not found/i);
    expect(openPathMock).not.toHaveBeenCalled();
  });

  it("delegates to shell.openPath for an existing file and returns its result", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cam-openpath-"));
    const file = path.join(dir, "f.md");
    fs.writeFileSync(file, "x", "utf-8");
    openPathMock.mockResolvedValue("");

    expect(await openPath(file)).toBe("");
    expect(openPathMock).toHaveBeenCalledWith(file);

    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("surfaces a non-empty shell error string", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cam-openpath-"));
    const file = path.join(dir, "g.md");
    fs.writeFileSync(file, "x", "utf-8");
    openPathMock.mockResolvedValue("no app associated");

    expect(await openPath(file)).toBe("no app associated");

    fs.rmSync(dir, { recursive: true, force: true });
  });
});
