// @vitest-environment node
import { describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

import { getAppVersion, readVersionFromPackageJson } from "./system.service";

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
