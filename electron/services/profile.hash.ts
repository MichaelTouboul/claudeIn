import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * A cheap staleness hash of a scope's `.claude` tree: the sorted list of
 * relative file paths plus each file's size and mtime. Content is never read,
 * so this stays fast on large trees while still changing whenever a file is
 * added, removed, or modified. A missing `.claude` hashes deterministically.
 */
export async function computeInputsHash(scopePath: string): Promise<string> {
  const claudeDir = path.join(scopePath, ".claude");
  const entries = await collectEntries(claudeDir, claudeDir);
  entries.sort((a, b) => a.rel.localeCompare(b.rel));

  const hash = createHash("sha256");
  for (const entry of entries) {
    hash.update(`${entry.rel}\0${entry.size}\0${entry.mtimeMs}\n`);
  }
  return hash.digest("hex");
}

type Entry = { rel: string; size: number; mtimeMs: number };

async function collectEntries(dir: string, root: string): Promise<Entry[]> {
  let dirents: import("node:fs").Dirent[];
  try {
    dirents = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return []; // missing/unreadable dir → empty contribution
  }

  const entries: Entry[] = [];
  for (const dirent of dirents) {
    const abs = path.join(dir, dirent.name);
    if (dirent.isDirectory()) {
      entries.push(...(await collectEntries(abs, root)));
      continue;
    }
    if (!dirent.isFile()) continue;
    try {
      const stat = await fs.stat(abs);
      entries.push({ rel: path.relative(root, abs), size: stat.size, mtimeMs: stat.mtimeMs });
    } catch {
      // file vanished mid-scan → skip
    }
  }
  return entries;
}
