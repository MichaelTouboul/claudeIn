import fs from "fs/promises";
import path from "path";
import { PROJECT_SCAN_DEPTH, PROJECT_SKIP_DIRS } from "./project.service";
import type { Candidate } from "../types/onboarding.types";

const HOME = process.env.HOME!;

// Plugin marker dir → plugin name. Extensible: add a row to detect more plugins.
const PLUGIN_DIRS: Record<string, string> = { ".a5c": "babysitter" };

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function detectPlugins(dir: string): Promise<string[]> {
  const plugins: string[] = [];
  for (const [marker, name] of Object.entries(PLUGIN_DIRS)) {
    if (await exists(path.join(dir, marker))) plugins.push(name);
  }
  return plugins;
}

async function makeCandidate(dir: string, root: string): Promise<Candidate> {
  const scope = dir === root || dir === HOME ? "user" : "project";
  return { path: dir, scope, hasClaude: true, plugins: await detectPlugins(dir) };
}

/**
 * Discover repos with a root-level `.claude` under `root` (default `$HOME`).
 * Depth-limited and skip-list-bounded via the shared `project.service` constants.
 * A found candidate is NOT descended into, so a nested `.claude` is never a
 * separate candidate. The scan root itself (or `$HOME`) maps to `user` scope.
 */
export async function scanCandidates(root: string = HOME): Promise<Candidate[]> {
  const candidates: Candidate[] = [];

  async function walk(dir: string, depth: number) {
    if (await exists(path.join(dir, ".claude"))) {
      candidates.push(await makeCandidate(dir, root));
      return; // do not descend into a found candidate
    }
    if (depth >= PROJECT_SCAN_DEPTH) return;
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith(".")) continue;
        if (PROJECT_SKIP_DIRS.has(entry.name)) continue;
        await walk(path.join(dir, entry.name), depth + 1);
      }
    } catch {
      // unreadable dir → skip
    }
  }

  await walk(root, 0);
  return candidates;
}
