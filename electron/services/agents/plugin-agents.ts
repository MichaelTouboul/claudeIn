import fs from "fs";
import os from "os";
import path from "path";
import matter from "gray-matter";
import type { AgentFrontmatter } from "../../types/agent.types";
import type { AgentSummary } from "../../types/agents-mirror.types";

/**
 * Plugin agents reader.
 *
 * Claude Code installs plugins under `~/.claude/plugins`. The authoritative list
 * of installed packs is `installed_plugins.json`, where each entry carries an
 * absolute `installPath` to the unpacked pack. By the plugin convention a pack
 * may ship sub-agents in `<installPath>/agents/*.md`, parsed exactly like user /
 * project agents (gray-matter frontmatter, require `name`). Those agents are
 * surfaced with `scope: "plugin"` and `source` = the pack name (from the pack's
 * `plugin.json` `name`, falling back to the install-key prefix before `@`).
 *
 * Read-only, synchronous (mirrors `agents.mirror.ts`), and never throws — a
 * missing registry, a missing `agents/` dir, or a malformed file each contribute
 * nothing rather than failing the whole scan. HOME is resolved at call time so
 * tests can redirect via `process.env.HOME`.
 */

interface InstalledEntry {
  installPath?: string;
}

interface InstalledRegistry {
  plugins?: Record<string, InstalledEntry[]>;
}

function pluginsDir(): string {
  const HOME = process.env.HOME || os.homedir();
  return path.join(HOME, ".claude", "plugins");
}

/** The pack name: `plugin.json` `name` wins, else the install-key prefix. */
function packName(installPath: string, installKey: string): string {
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(installPath, "plugin.json"), "utf-8"));
    if (manifest && typeof manifest.name === "string" && manifest.name) return manifest.name;
  } catch {
    // no/invalid plugin.json → fall through to the key
  }
  return installKey.split("@")[0];
}

/** Parse one `agents/*.md` file into a plugin-scope summary, or null. */
function parsePluginAgent(
  filePath: string,
  agentsRoot: string,
  source: string,
): AgentSummary | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data } = matter(raw);
    if (!data.name) return null;
    const fm = data as AgentFrontmatter;
    const relativePath = path.relative(agentsRoot, filePath);
    const folder = path.dirname(relativePath);
    return {
      id: fm.name,
      scope: "plugin",
      filePath,
      relativePath,
      folder: folder === "." ? "" : folder,
      frontmatter: fm,
      subAgents: Array.isArray(fm.subAgents) ? fm.subAgents : [],
      shadowed: false,
      source,
    };
  } catch {
    return null;
  }
}

/** Recursively collect the `.md` agents under a pack's `agents/` dir. */
function scanAgentsRoot(agentsRoot: string, source: string): AgentSummary[] {
  const out: AgentSummary[] = [];
  function walk(current: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "memory") continue;
        walk(full);
      } else if (entry.name.endsWith(".md")) {
        const agent = parsePluginAgent(full, agentsRoot, source);
        if (agent) out.push(agent);
      }
    }
  }
  if (!fs.existsSync(agentsRoot)) return out;
  walk(agentsRoot);
  return out;
}

/** Read every installed plugin's `agents/` dir into plugin-scope summaries. */
export function scanPluginAgents(): AgentSummary[] {
  const registryPath = path.join(pluginsDir(), "installed_plugins.json");
  let registry: InstalledRegistry;
  try {
    registry = JSON.parse(fs.readFileSync(registryPath, "utf-8")) as InstalledRegistry;
  } catch {
    return [];
  }

  const agents: AgentSummary[] = [];
  const seen = new Set<string>(); // dedupe identical installPaths across scopes
  for (const [key, entries] of Object.entries(registry.plugins ?? {})) {
    for (const entry of entries) {
      const installPath = entry.installPath;
      if (!installPath || seen.has(installPath)) continue;
      seen.add(installPath);
      const source = packName(installPath, key);
      agents.push(...scanAgentsRoot(path.join(installPath, "agents"), source));
    }
  }
  return agents;
}
