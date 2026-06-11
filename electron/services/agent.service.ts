import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import type {
  AgentFile,
  AgentFrontmatter,
  MemoryFile,
  AnnexFile,
  AgentCreatePayload,
  AgentUpdatePayload,
} from "../types/agent.types";

const AGENTS_DIR = path.join(process.env.HOME!, ".claude", "agents");

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function findMdFiles(dir: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(current: string) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.name.endsWith(".md")) {
        results.push(full);
      }
    }
  }

  if (await exists(dir)) {
    await walk(dir);
  }
  return results;
}

async function findAnnexFiles(agentDir: string, agentFileName: string): Promise<AnnexFile[]> {
  const annexFiles: AnnexFile[] = [];
  if (!(await exists(agentDir))) return annexFiles;

  const entries = await fs.readdir(agentDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile()) {
      const full = path.join(agentDir, entry.name);
      const content = await fs.readFile(full, "utf-8");
      annexFiles.push({
        name: entry.name,
        path: full,
        content,
        isEnv: entry.name === ".env",
      });
    }
  }

  return annexFiles;
}

function extractSubAgents(body: string): string[] {
  const agents: string[] = [];
  const backtickPattern = /`(tw-[\w-]+)`/g;
  let match;
  while ((match = backtickPattern.exec(body)) !== null) {
    if (!agents.includes(match[1])) {
      agents.push(match[1]);
    }
  }
  return agents;
}

async function getMemoryFiles(agentDir: string): Promise<MemoryFile[]> {
  const memDir = path.join(agentDir, "memory");
  if (!(await exists(memDir))) return [];

  const entries = await fs.readdir(memDir, { withFileTypes: true });
  const files: MemoryFile[] = [];

  for (const entry of entries) {
    if (entry.isFile()) {
      const full = path.join(memDir, entry.name);
      const content = await fs.readFile(full, "utf-8");
      const stat = await fs.stat(full);
      files.push({
        name: entry.name,
        path: full,
        content,
        lastModified: stat.mtime.toISOString(),
      });
    }
  }

  return files;
}

/**
 * Resolve the agents-root a file belongs to. User agents live under
 * `~/.claude/agents`; project agents under `<project>/.claude/agents`. We walk
 * up to the nearest ancestor `agents` dir whose parent is `.claude` so the
 * `relativePath`/`folder` are computed against the agent's OWN root regardless
 * of scope (the legacy code hard-coded the user `AGENTS_DIR`, which is wrong for
 * project agents). Falls back to the user `AGENTS_DIR` when no such ancestor
 * exists (keeps existing behavior for user-scope files).
 */
function agentsRootFor(filePath: string): string {
  let dir = path.dirname(filePath);
  while (true) {
    if (path.basename(dir) === "agents" && path.basename(path.dirname(dir)) === ".claude") {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return AGENTS_DIR;
    dir = parent;
  }
}

function parseAgent(filePath: string, raw: string): AgentFile | null {
  try {
    const { data, content } = matter(raw);
    if (!data.name) return null;

    const frontmatter = data as AgentFrontmatter;
    const root = agentsRootFor(filePath);
    const relativePath = path.relative(root, filePath);
    const folder = path.dirname(relativePath);

    return {
      id: frontmatter.name,
      filePath,
      relativePath,
      folder: folder === "." ? "" : folder,
      frontmatter,
      body: content.trim(),
      status: "created",
      subAgents: Array.isArray(frontmatter.subAgents) && frontmatter.subAgents.length > 0
        ? frontmatter.subAgents
        : extractSubAgents(content),
      memoryFiles: [],
      annexFiles: [],
    };
  } catch {
    return null;
  }
}

/**
 * Attach the heavy on-disk content (memory files, annex files, shared parent
 * `.env`) to a parsed agent. Shared by the bulk `getAllAgents` walk and the
 * single-file `getAgentByPath` resolver so both scopes enrich identically.
 */
async function enrichAgent(agent: AgentFile): Promise<AgentFile> {
  const filePath = agent.filePath;
  agent.memoryFiles = await getMemoryFiles(path.dirname(filePath));
  agent.annexFiles = await findAnnexFiles(path.dirname(filePath), path.basename(filePath));

  const root = agentsRootFor(filePath);
  const parentDir = path.dirname(path.dirname(filePath));
  const parentRelative = path.relative(root, parentDir);
  if (parentRelative && parentRelative !== ".") {
    const parentEnvPath = path.join(parentDir, ".env");
    if (await exists(parentEnvPath)) {
      const alreadyHas = agent.annexFiles.some((f) => f.path === parentEnvPath);
      if (!alreadyHas) {
        const content = await fs.readFile(parentEnvPath, "utf-8");
        agent.annexFiles.push({
          name: ".env (shared)",
          path: parentEnvPath,
          content,
          isEnv: true,
        });
      }
    }
  }

  return agent;
}

export async function getAllAgents(): Promise<AgentFile[]> {
  const mdFiles = await findMdFiles(AGENTS_DIR);
  const agents: AgentFile[] = [];

  for (const filePath of mdFiles) {
    const raw = await fs.readFile(filePath, "utf-8");
    const agent = parseAgent(filePath, raw);
    if (agent) {
      agents.push(await enrichAgent(agent));
    }
  }

  return agents;
}

export async function getAgent(name: string): Promise<AgentFile | null> {
  const all = await getAllAgents();
  return all.find((a) => a.id === name) ?? null;
}

/**
 * Resolve the full agent from its absolute file path — scope-agnostic. The
 * sidebar mirror lists BOTH user and project agents and carries each one's
 * absolute `filePath`; the management view uses this to open any of them.
 *
 * The legacy `getAgent(name)` only scanned `~/.claude/agents`, so clicking a
 * project-scope agent resolved to null → "Agent not found". This resolver reads
 * the exact file the summary points at, so project agents open correctly.
 * Returns null when the file is missing or has no frontmatter `name`.
 */
export async function getAgentByPath(filePath: string): Promise<AgentFile | null> {
  if (!(await exists(filePath))) return null;
  const raw = await fs.readFile(filePath, "utf-8");
  const agent = parseAgent(filePath, raw);
  if (!agent) return null;
  return enrichAgent(agent);
}

export async function createAgent(payload: AgentCreatePayload): Promise<AgentFile> {
  const dir = path.join(AGENTS_DIR, payload.folder, payload.fileName);
  await fs.mkdir(dir, { recursive: true });

  const filePath = path.join(dir, `${payload.fileName}.md`);
  const content = matter.stringify(payload.body, payload.frontmatter);
  await fs.writeFile(filePath, content, "utf-8");

  const agent = parseAgent(filePath, content);
  if (!agent) throw new Error("Failed to parse created agent");

  agent.memoryFiles = await getMemoryFiles(dir);
  agent.annexFiles = await findAnnexFiles(dir, `${payload.fileName}.md`);
  return agent;
}

export async function updateAgent(name: string, payload: AgentUpdatePayload): Promise<AgentFile> {
  const agent = await getAgent(name);
  if (!agent) throw new Error(`Agent ${name} not found`);

  const raw = await fs.readFile(agent.filePath, "utf-8");
  const { data, content } = matter(raw);

  const newFrontmatter = payload.frontmatter ? { ...data, ...payload.frontmatter } : data;
  const newBody = payload.body ?? content;
  const newContent = matter.stringify(newBody, newFrontmatter);

  await fs.writeFile(agent.filePath, newContent, "utf-8");

  const updated = parseAgent(agent.filePath, newContent);
  if (!updated) throw new Error("Failed to parse updated agent");

  updated.memoryFiles = await getMemoryFiles(path.dirname(agent.filePath));
  updated.annexFiles = agent.annexFiles;
  return updated;
}

export async function deleteAgent(name: string): Promise<void> {
  const agent = await getAgent(name);
  if (!agent) throw new Error(`Agent ${name} not found`);

  const dir = path.dirname(agent.filePath);
  const entries = await fs.readdir(dir);
  const mdFiles = entries.filter((e) => e.endsWith(".md"));

  if (mdFiles.length === 1 && entries.length <= 2) {
    await fs.rm(dir, { recursive: true });
  } else {
    await fs.unlink(agent.filePath);
  }
}

async function resolveAgentMemoryDir(agentName: string): Promise<string | null> {
  const agent = await getAgent(agentName);
  if (!agent) return null;
  return path.join(path.dirname(agent.filePath), "memory");
}

export async function getMemoryFile(agentName: string, fileName: string): Promise<MemoryFile | null> {
  const memDir = await resolveAgentMemoryDir(agentName);
  if (!memDir) return null;

  const memPath = path.join(memDir, fileName);
  if (!(await exists(memPath))) return null;

  const content = await fs.readFile(memPath, "utf-8");
  const stat = await fs.stat(memPath);
  return {
    name: fileName,
    path: memPath,
    content,
    lastModified: stat.mtime.toISOString(),
  };
}

export async function updateMemoryFile(
  agentName: string,
  fileName: string,
  content: string
): Promise<MemoryFile> {
  const memDir = await resolveAgentMemoryDir(agentName);
  if (!memDir) throw new Error(`Agent ${agentName} not found`);

  await fs.mkdir(memDir, { recursive: true });

  const memPath = path.join(memDir, fileName);
  await fs.writeFile(memPath, content, "utf-8");

  const stat = await fs.stat(memPath);
  return {
    name: fileName,
    path: memPath,
    content,
    lastModified: stat.mtime.toISOString(),
  };
}

export async function deleteMemoryFile(agentName: string, fileName: string): Promise<void> {
  const memDir = await resolveAgentMemoryDir(agentName);
  if (!memDir) return;

  const memPath = path.join(memDir, fileName);
  if (await exists(memPath)) {
    await fs.unlink(memPath);
  }
}

export async function getFolders(): Promise<string[]> {
  const folders: string[] = [""];
  if (!(await exists(AGENTS_DIR))) return folders;

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const full = path.join(dir, entry.name);
        folders.push(path.relative(AGENTS_DIR, full));
        await walk(full);
      }
    }
  }

  await walk(AGENTS_DIR);
  return folders;
}
