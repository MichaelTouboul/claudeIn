// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

import { resolveProjectModel } from "../session/session.transcript";

// resolveProjectModel reads the project's `.claude` settings as the source of
// truth for the model/window. Precedence (first non-empty wins):
//   1. <projectPath>/.claude/settings.local.json → .model
//   2. <projectPath>/.claude/settings.json       → .model
//   3. ~/.claude/settings.json                   → .model   (HOME-overridable)
let tmpHome: string;
let tmpProject: string;
let prevHome: string | undefined;

beforeEach(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "cam-proj-model-home-"));
  tmpProject = fs.mkdtempSync(path.join(os.tmpdir(), "cam-proj-model-proj-"));
  prevHome = process.env.HOME;
  process.env.HOME = tmpHome;
});

afterEach(() => {
  process.env.HOME = prevHome;
  fs.rmSync(tmpHome, { recursive: true, force: true });
  fs.rmSync(tmpProject, { recursive: true, force: true });
});

function writeProjectSettings(file: string, data: unknown): void {
  const dir = path.join(tmpProject, ".claude");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, file), JSON.stringify(data), "utf-8");
}

function writeUserSettings(data: unknown): void {
  const dir = path.join(tmpHome, ".claude");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "settings.json"), JSON.stringify(data), "utf-8");
}

describe("resolveProjectModel — precedence", () => {
  it("settings.local.json wins over settings.json and user settings", () => {
    writeUserSettings({ model: "user-model" });
    writeProjectSettings("settings.json", { model: "project-model" });
    writeProjectSettings("settings.local.json", { model: "local-model[1m]" });
    expect(resolveProjectModel(tmpProject)).toBe("local-model[1m]");
  });

  it("settings.json wins over user settings when no local override", () => {
    writeUserSettings({ model: "user-model" });
    writeProjectSettings("settings.json", { model: "project-model[1m]" });
    expect(resolveProjectModel(tmpProject)).toBe("project-model[1m]");
  });

  it("falls back to the global user settings.json when project has none", () => {
    writeUserSettings({ model: "user-model[1m]" });
    expect(resolveProjectModel(tmpProject)).toBe("user-model[1m]");
  });

  it("returns null when no layer carries a model", () => {
    writeUserSettings({ otherKey: 1 });
    writeProjectSettings("settings.json", { otherKey: 2 });
    expect(resolveProjectModel(tmpProject)).toBeNull();
  });

  it("returns null when no settings files exist at all", () => {
    expect(resolveProjectModel(tmpProject)).toBeNull();
  });
});

describe("resolveProjectModel — defensive reads", () => {
  it("skips a malformed JSON layer and falls through to the next", () => {
    const dir = path.join(tmpProject, ".claude");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "settings.local.json"), "{ not valid json", "utf-8");
    writeProjectSettings("settings.json", { model: "project-model" });
    expect(resolveProjectModel(tmpProject)).toBe("project-model");
  });

  it("ignores a non-string model value and falls through", () => {
    writeProjectSettings("settings.local.json", { model: 42 });
    writeUserSettings({ model: "user-model" });
    expect(resolveProjectModel(tmpProject)).toBe("user-model");
  });

  it("ignores an empty-string model and falls through", () => {
    writeProjectSettings("settings.local.json", { model: "" });
    writeProjectSettings("settings.json", { model: "project-model" });
    expect(resolveProjectModel(tmpProject)).toBe("project-model");
  });
});
