// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// project.service captures `process.env.HOME` at module load (for USER_CLAUDE_DIR,
// which drives getSkill's scope inference). Set HOME to a temp dir and import the
// module dynamically per test so the user scope resolves under our fixture.
let tmpHome: string;
let prevHome: string | undefined;

beforeEach(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "cam-getskill-"));
  prevHome = process.env.HOME;
  process.env.HOME = tmpHome;
});

afterEach(() => {
  process.env.HOME = prevHome;
  fs.rmSync(tmpHome, { recursive: true, force: true });
});

function writeSkill(skillDir: string, frontmatter: string, body: string): string {
  fs.mkdirSync(skillDir, { recursive: true });
  const skillFile = path.join(skillDir, "SKILL.md");
  fs.writeFileSync(skillFile, `---\n${frontmatter}\n---\n${body}\n`, "utf-8");
  return skillFile;
}

describe("getSkill", () => {
  it("reads one SKILL.md fully including body and annex files", async () => {
    const { getSkill } = await import("./project.skills?fresh=read");
    const skillDir = path.join(tmpHome, "proj", ".claude", "skills", "my-skill");
    const skillFile = writeSkill(
      skillDir,
      'name: my-skill\ndescription: A test skill\nlicense: MIT',
      "# Heading\n\nbody line two",
    );
    // Annex files: one file + one directory.
    fs.writeFileSync(path.join(skillDir, "reference.md"), "ref contents", "utf-8");
    fs.mkdirSync(path.join(skillDir, "scripts"));

    const skill = await getSkill(skillFile);
    expect(skill).not.toBeNull();
    expect(skill?.name).toBe("my-skill");
    expect(skill?.description).toBe("A test skill");
    expect(skill?.license).toBe("MIT");
    expect(skill?.scope).toBe("project");
    expect(skill?.body).toBe("# Heading\n\nbody line two");
    expect(skill?.lineCount).toBe(3);

    const annexNames = (skill?.annexFiles ?? []).map((f) => f.name).sort();
    expect(annexNames).toEqual(["reference.md", "scripts"]);
    const scripts = skill?.annexFiles.find((f) => f.name === "scripts");
    expect(scripts?.isDirectory).toBe(true);
    const ref = skill?.annexFiles.find((f) => f.name === "reference.md");
    expect(ref?.isDirectory).toBe(false);
    expect(ref?.size).toBeGreaterThan(0);
  });

  it("infers user scope for skills under ~/.claude", async () => {
    const { getSkill } = await import("./project.skills?fresh=user");
    const skillFile = writeSkill(
      path.join(tmpHome, ".claude", "skills", "user-skill"),
      "name: user-skill\ndescription: d",
      "body",
    );
    const skill = await getSkill(skillFile);
    expect(skill?.scope).toBe("user");
  });

  it("falls back to the directory name when frontmatter has no name", async () => {
    const { getSkill } = await import("./project.skills?fresh=fallback");
    const skillFile = writeSkill(
      path.join(tmpHome, "proj", ".claude", "skills", "dir-named"),
      "description: no name here",
      "body",
    );
    const skill = await getSkill(skillFile);
    expect(skill?.name).toBe("dir-named");
  });

  it("returns null when the SKILL.md is missing", async () => {
    const { getSkill } = await import("./project.skills?fresh=missing");
    const missing = path.join(tmpHome, "proj", ".claude", "skills", "ghost", "SKILL.md");
    expect(await getSkill(missing)).toBeNull();
  });
});
