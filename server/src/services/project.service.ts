import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import type { Project, SkillFile, HookConfig } from "../types/project.types.js";
import type { AgentFile, AgentFrontmatter, MemoryFile, AnnexFile } from "../types/agent.types.js";

const HOME = process.env.HOME!;
const USER_CLAUDE_DIR = path.join(HOME, ".claude");
const SCAN_DEPTH = 3;
const SKIP_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", ".cache",
  ".npm", ".nvm", ".cargo", ".rustup", "Library", ".Trash",
  "Applications", ".docker", ".vscode", ".idea",
]);

async function exists(p: string): Promise<boolean> {
  try { await fs.access(p); return true; } catch { return false; }
}

async function scanForProjects(): Promise<Project[]> {
  const projects: Project[] = [];
  const seen = new Set<string>();

  async function walk(dir: string, depth: number) {
    if (depth > SCAN_DEPTH) return;
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith(".") && entry.name !== ".claude") continue;
        if (SKIP_DIRS.has(entry.name)) continue;

        const full = path.join(dir, entry.name);

        if (entry.name === ".claude") {
          const projectPath = dir;
          if (seen.has(projectPath) || projectPath === HOME) continue;
          seen.add(projectPath);

          const claudeDir = full;
          const agentsDir = path.join(claudeDir, "agents");
          const skillsDir = path.join(claudeDir, "skills");
          const settingsFile = path.join(claudeDir, "settings.json");

          const agentCount = await countMdFiles(agentsDir);
          const skillCount = await countSkills(skillsDir);

          projects.push({
            id: Buffer.from(projectPath).toString("base64url"),
            name: path.basename(projectPath),
            path: projectPath,
            claudeDir,
            hasAgents: agentCount > 0,
            hasSkills: skillCount > 0,
            hasSettings: await exists(settingsFile),
            agentCount,
            skillCount,
          });
        } else {
          await walk(full, depth + 1);
        }
      }
    } catch {}
  }

  await walk(HOME, 0);

  const userProject: Project = {
    id: "user",
    name: "User Scope",
    path: HOME,
    claudeDir: USER_CLAUDE_DIR,
    hasAgents: await exists(path.join(USER_CLAUDE_DIR, "agents")),
    hasSkills: await exists(path.join(USER_CLAUDE_DIR, "skills")),
    hasSettings: await exists(path.join(USER_CLAUDE_DIR, "settings.json")),
    agentCount: await countMdFiles(path.join(USER_CLAUDE_DIR, "agents")),
    skillCount: await countSkills(path.join(USER_CLAUDE_DIR, "skills")),
  };
  projects.unshift(userProject);

  return projects;
}

async function countMdFiles(dir: string): Promise<number> {
  if (!(await exists(dir))) return 0;
  let count = 0;
  async function walk(d: string) {
    const entries = await fs.readdir(d, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory() && e.name !== "memory") await walk(full);
      else if (e.name.endsWith(".md")) {
        try {
          const raw = await fs.readFile(full, "utf-8");
          const { data } = matter(raw);
          if (data.name) count++;
        } catch {}
      }
    }
  }
  await walk(dir);
  return count;
}

async function countSkills(dir: string): Promise<number> {
  if (!(await exists(dir))) return 0;
  let count = 0;
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) {
        const skillFile = path.join(dir, e.name, "SKILL.md");
        if (await exists(skillFile)) count++;
      }
    }
  } catch {}
  return count;
}

let cachedProjects: Project[] | null = null;
let lastScan = 0;
const CACHE_TTL = 60_000;

export async function getProjects(forceRefresh = false): Promise<Project[]> {
  if (!forceRefresh && cachedProjects && Date.now() - lastScan < CACHE_TTL) {
    return cachedProjects;
  }
  cachedProjects = await scanForProjects();
  lastScan = Date.now();
  return cachedProjects;
}

export async function getProject(id: string): Promise<Project | null> {
  const projects = await getProjects();
  return projects.find((p) => p.id === id) ?? null;
}

export async function getProjectAgents(projectId: string): Promise<AgentFile[]> {
  const project = await getProject(projectId);
  if (!project) return [];

  const agentsDir = path.join(project.claudeDir, "agents");
  return findAgentsInDir(agentsDir, project.id === "user" ? "user" : "project");
}

export async function getProjectSkills(projectId: string): Promise<SkillFile[]> {
  const project = await getProject(projectId);
  if (!project) return [];

  const skillsDir = path.join(project.claudeDir, "skills");
  return findSkillsInDir(skillsDir, project.id === "user" ? "user" : "project");
}

export async function getProjectHooks(projectId: string): Promise<HookConfig[]> {
  const project = await getProject(projectId);
  if (!project) return [];

  const settingsFile = path.join(project.claudeDir, "settings.json");
  if (!(await exists(settingsFile))) return [];

  try {
    const raw = await fs.readFile(settingsFile, "utf-8");
    const settings = JSON.parse(raw);
    return parseHooks(settings.hooks || {});
  } catch {
    return [];
  }
}

function parseHooks(hooks: Record<string, unknown>): HookConfig[] {
  const result: HookConfig[] = [];
  for (const [event, entries] of Object.entries(hooks)) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      const matcher = entry.matcher || "*";
      const hookList = entry.hooks || [];
      for (const hook of hookList) {
        if (hook.type === "command" && hook.command) {
          result.push({ event, matcher, command: hook.command });
        }
      }
    }
  }
  return result;
}

async function findAgentsInDir(dir: string, scope: "user" | "project"): Promise<AgentFile[]> {
  if (!(await exists(dir))) return [];
  const agents: AgentFile[] = [];

  async function walk(current: string) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory() && entry.name !== "memory") {
        await walk(full);
      } else if (entry.name.endsWith(".md")) {
        try {
          const raw = await fs.readFile(full, "utf-8");
          const { data, content } = matter(raw);
          if (!data.name) continue;

          const fm = data as AgentFrontmatter;
          const relativePath = path.relative(dir, full);
          const folder = path.dirname(relativePath);

          const memoryFiles = await loadMemoryFiles(path.join(path.dirname(full), "memory"));
          const annexFiles = await loadAnnexFiles(path.dirname(full), entry.name);

          agents.push({
            id: fm.name,
            filePath: full,
            relativePath,
            folder: folder === "." ? "" : folder,
            frontmatter: fm,
            body: content.trim(),
            status: "created",
            subAgents: Array.isArray(fm.subAgents) && fm.subAgents.length > 0
              ? fm.subAgents
              : extractSubAgents(content),
            memoryFiles,
            annexFiles,
          });
        } catch {}
      }
    }
  }

  await walk(dir);
  return agents;
}

async function findSkillsInDir(dir: string, scope: "user" | "project"): Promise<SkillFile[]> {
  if (!(await exists(dir))) return [];
  const skills: SkillFile[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const skillDir = path.join(dir, entry.name);
      const skillFile = path.join(skillDir, "SKILL.md");
      if (!(await exists(skillFile))) continue;

      try {
        const raw = await fs.readFile(skillFile, "utf-8");
        const { data, content } = matter(raw);
        const body = content.trim();

        const annexFiles: import("../types/project.types.js").SkillAnnexFile[] = [];
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

        skills.push({
          name: data.name || entry.name,
          description: data.description || "",
          filePath: skillFile,
          scope,
          body,
          lineCount: body.split("\n").length,
          license: data.license || undefined,
          metadata: data.metadata || undefined,
          annexFiles,
        });
      } catch {}
    }
  } catch {}

  return skills;
}

async function loadMemoryFiles(memDir: string): Promise<MemoryFile[]> {
  if (!(await exists(memDir))) return [];
  const files: MemoryFile[] = [];
  const entries = await fs.readdir(memDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const full = path.join(memDir, entry.name);
    const content = await fs.readFile(full, "utf-8");
    const stat = await fs.stat(full);
    files.push({ name: entry.name, path: full, content, lastModified: stat.mtime.toISOString() });
  }
  return files;
}

async function loadAnnexFiles(agentDir: string, agentFileName: string): Promise<AnnexFile[]> {
  const annexFiles: AnnexFile[] = [];
  const entries = await fs.readdir(agentDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name !== ".DS_Store") {
      const full = path.join(agentDir, entry.name);
      const content = await fs.readFile(full, "utf-8");
      annexFiles.push({ name: entry.name, path: full, content, isEnv: entry.name === ".env" });
    }
  }
  return annexFiles;
}

function extractSubAgents(body: string): string[] {
  const agents: string[] = [];
  const pattern = /`(tw-[\w-]+)`/g;
  let match;
  while ((match = pattern.exec(body)) !== null) {
    if (!agents.includes(match[1])) agents.push(match[1]);
  }
  return agents;
}
