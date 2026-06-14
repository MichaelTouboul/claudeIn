import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import type { SkillAnnexFile, SkillFile } from "../../types/project.types";

const HOME = process.env.HOME!;
const USER_CLAUDE_DIR = path.join(HOME, ".claude");

async function exists(p: string): Promise<boolean> {
  try { await fs.access(p); return true; } catch { return false; }
}

/**
 * Read one skill (a folder containing `SKILL.md`) fully, including its annex
 * files. `dirName` is the fallback skill name when frontmatter has no `name`.
 * Returns null if the dir has no readable `SKILL.md`.
 */
async function readSkillDir(
  skillDir: string,
  dirName: string,
  scope: "user" | "project",
): Promise<SkillFile | null> {
  const skillFile = path.join(skillDir, "SKILL.md");
  if (!(await exists(skillFile))) return null;

  try {
    const raw = await fs.readFile(skillFile, "utf-8");
    const { data, content } = matter(raw);
    const body = content.trim();

    const annexFiles: SkillAnnexFile[] = [];
    const dirEntries = await fs.readdir(skillDir, { withFileTypes: true });
    for (const f of dirEntries) {
      if (f.name === "SKILL.md") continue;
      const full = path.join(skillDir, f.name);
      if (f.isDirectory()) {
        annexFiles.push({ name: f.name, path: full, size: 0, isDirectory: true });
      } else {
        const stat = await fs.stat(full);
        annexFiles.push({ name: f.name, path: full, size: stat.size, isDirectory: false });
      }
    }

    return {
      name: data.name || dirName,
      description: data.description || "",
      filePath: skillFile,
      scope,
      body,
      lineCount: body.split("\n").length,
      license: data.license || undefined,
      metadata: data.metadata || undefined,
      annexFiles,
    };
  } catch {
    return null;
  }
}

/**
 * Read a single skill given its `SKILL.md` path (full content incl. annex
 * files). Scope is inferred from whether the path lives under the user
 * `~/.claude` dir. Returns null when the file is missing/unreadable.
 */
export async function getSkill(filePath: string): Promise<SkillFile | null> {
  if (!(await exists(filePath))) return null;
  const skillDir = path.dirname(filePath);
  const dirName = path.basename(skillDir);
  const scope = filePath.startsWith(USER_CLAUDE_DIR) ? "user" : "project";
  return readSkillDir(skillDir, dirName, scope);
}

/** Read every skill (one per top-level subdir with a `SKILL.md`) in `dir`. */
export async function findSkillsInDir(
  dir: string,
  scope: "user" | "project",
): Promise<SkillFile[]> {
  if (!(await exists(dir))) return [];
  const skills: SkillFile[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const skillDir = path.join(dir, entry.name);
      const skill = await readSkillDir(skillDir, entry.name, scope);
      if (skill) skills.push(skill);
    }
  } catch {}

  return skills;
}
