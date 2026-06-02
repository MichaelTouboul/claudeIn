// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// Mock broadcast now so it's in place for Phase 3's watch test too.
vi.mock("./broadcast", () => ({ broadcast: vi.fn() }));

import { broadcast } from "./broadcast";
import { getSkillsMirror, unwatchSkills } from "./skills.mirror";

const broadcastMock = vi.mocked(broadcast);

let tmpHome: string;
let prevHome: string | undefined;
let userSkillsDir: string;

beforeEach(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "cam-skills-"));
  prevHome = process.env.HOME;
  process.env.HOME = tmpHome;
  userSkillsDir = path.join(tmpHome, ".claude", "skills");
  fs.mkdirSync(userSkillsDir, { recursive: true });
  broadcastMock.mockClear();
});

afterEach(() => {
  unwatchSkills(); // always tear down watchers/timers to avoid leaks
  process.env.HOME = prevHome;
  fs.rmSync(tmpHome, { recursive: true, force: true });
});

function writeSkill(
  skillsDir: string,
  dirName: string,
  frontmatter: Record<string, unknown>,
  body = "x",
) {
  const skillDir = path.join(skillsDir, dirName);
  fs.mkdirSync(skillDir, { recursive: true });
  const fm = Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join("\n");
  fs.writeFileSync(path.join(skillDir, "SKILL.md"), `---\n${fm}\n---\n${body}\n`);
}

describe("skills.mirror getSkillsMirror", () => {
  it("reads user */SKILL.md frontmatter into lightweight summaries (no body/annex)", () => {
    writeSkill(userSkillsDir, "alpha", { name: "alpha", description: "A" });
    const snap = getSkillsMirror();
    expect(snap.projectPath).toBeNull();
    const alpha = snap.skills.find((s) => s.name === "alpha");
    expect(alpha?.scope).toBe("user");
    expect(alpha?.description).toBe("A");
    expect(alpha?.filePath).toBe(path.join(userSkillsDir, "alpha", "SKILL.md"));
    expect(alpha).not.toHaveProperty("body"); // heavy content excluded
    expect(alpha).not.toHaveProperty("annexFiles");
  });

  it("skips directories without a SKILL.md and uses the dir name when name is absent", () => {
    writeSkill(userSkillsDir, "good", { name: "good", description: "G" });
    // A directory with no SKILL.md is not a skill.
    fs.mkdirSync(path.join(userSkillsDir, "not-a-skill"), { recursive: true });
    fs.writeFileSync(path.join(userSkillsDir, "not-a-skill", "README.md"), "nope");
    // A SKILL.md without a name frontmatter → falls back to the dir name.
    writeSkill(userSkillsDir, "nameless", { description: "no name field" });

    const skills = getSkillsMirror().skills;
    const names = skills.map((s) => s.name).sort();
    expect(names).toEqual(["good", "nameless"]);
    expect(skills.find((s) => s.name === "nameless")?.description).toBe("no name field");
  });

  it("carries metadata and computes lineCount; omits heavy content", () => {
    writeSkill(
      userSkillsDir,
      "meta",
      { name: "meta", description: "M", metadata: { author: "me", version: "1.0" } },
      "line one\nline two\nline three",
    );
    const meta = getSkillsMirror().skills.find((s) => s.name === "meta");
    expect(meta?.metadata).toEqual({ author: "me", version: "1.0" });
    expect(meta?.lineCount).toBe(3);
  });

  it("project scope: adds project skills and project shadows user on name collision", () => {
    const projDir = fs.mkdtempSync(path.join(os.tmpdir(), "cam-proj-"));
    const projSkillsDir = path.join(projDir, ".claude", "skills");
    writeSkill(userSkillsDir, "dup", { name: "dup", description: "user version" });
    writeSkill(userSkillsDir, "only-user", { name: "only-user", description: "U" });
    writeSkill(projSkillsDir, "dup", { name: "dup", description: "project version" });

    const snap = getSkillsMirror(projDir);
    expect(snap.projectPath).toBe(projDir);
    const projDup = snap.skills.find((s) => s.name === "dup" && s.scope === "project");
    const userDup = snap.skills.find((s) => s.name === "dup" && s.scope === "user");
    expect(projDup?.shadowed).toBe(false);
    expect(userDup?.shadowed).toBe(true);
    expect(snap.skills.find((s) => s.name === "only-user")?.shadowed).toBe(false);
    fs.rmSync(projDir, { recursive: true, force: true });
  });

  it("missing user skills dir → empty list, never throws", () => {
    fs.rmSync(userSkillsDir, { recursive: true, force: true });
    expect(() => getSkillsMirror()).not.toThrow();
    expect(getSkillsMirror().skills).toEqual([]);
  });
});
