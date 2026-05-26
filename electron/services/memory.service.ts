import fs from "fs/promises";
import path from "path";

const HOME = process.env.HOME!;
const PROJECTS_MEMORY_BASE = path.join(HOME, ".claude", "projects");

async function exists(p: string): Promise<boolean> {
  try { await fs.access(p); return true; } catch { return false; }
}

function resolveProjectMemoryDir(projectPath: string): string {
  const normalized = projectPath.replace(/\//g, "-").replace(/^-/, "");
  return path.join(PROJECTS_MEMORY_BASE, normalized, "memory");
}

export type ProjectMemoryFile = {
  name: string;
  path: string;
  content: string;
  lastModified: string;
  lines: number;
  bytes: number;
};

export async function getProjectMemory(projectPath: string): Promise<ProjectMemoryFile[]> {
  const memDir = resolveProjectMemoryDir(projectPath);
  if (!(await exists(memDir))) return [];

  const entries = await fs.readdir(memDir, { withFileTypes: true });
  const files: ProjectMemoryFile[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const full = path.join(memDir, entry.name);
    const content = await fs.readFile(full, "utf-8");
    const stat = await fs.stat(full);
    files.push({
      name: entry.name,
      path: full,
      content,
      lastModified: stat.mtime.toISOString(),
      lines: content.split("\n").length,
      bytes: Buffer.byteLength(content, "utf-8"),
    });
  }

  return files;
}

export async function updateProjectMemoryFile(
  projectPath: string,
  fileName: string,
  content: string
): Promise<ProjectMemoryFile> {
  const memDir = resolveProjectMemoryDir(projectPath);
  await fs.mkdir(memDir, { recursive: true });
  const full = path.join(memDir, fileName);
  await fs.writeFile(full, content, "utf-8");
  const stat = await fs.stat(full);
  return {
    name: fileName,
    path: full,
    content,
    lastModified: stat.mtime.toISOString(),
    lines: content.split("\n").length,
    bytes: Buffer.byteLength(content, "utf-8"),
  };
}

export async function deleteProjectMemoryFile(projectPath: string, fileName: string): Promise<void> {
  const memDir = resolveProjectMemoryDir(projectPath);
  const full = path.join(memDir, fileName);
  if (await exists(full)) {
    await fs.unlink(full);
  }
}
