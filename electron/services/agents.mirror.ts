import fs from "fs";
import os from "os";
import path from "path";
import matter from "gray-matter";
import { unionAgents } from "./agents.union";
import type { AgentFrontmatter } from "../types/agent.types";
import type { AgentScope, AgentSummary, AgentsSnapshot } from "../types/agents-mirror.types";

/**
 * Agents mirror service: reads the UNION of user (`~/.claude/agents`) and
 * project (`<projectPath>/.claude/agents`) agents into a lightweight
 * `AgentSummary[]`, watches both dirs recursively, and broadcasts
 * `agents_changed` whenever the snapshot changes.
 *
 * Additive & read-only — builds NEAR (not on top of) the existing
 * `agent.service.ts` / `project.service.getProjectAgents` readers. The
 * `findAgentsInDir`/`countMdFiles` behavior (recursive walk, skip `memory/`,
 * require frontmatter `name`, subAgents precedence) is REPLICATED here, not
 * called.
 *
 * HOME is resolved at call time (`process.env.HOME || os.homedir()`, like
 * `session.service.ts`) so tests can redirect the user scope via
 * `process.env.HOME`. The scan is synchronous (`fs.readFileSync` + `matter`),
 * consistent with the settings service; the IPC contract is `Promise<…>` only
 * because Electron wraps it.
 *
 * The summary is intentionally LIGHTWEIGHT: no body, no memory files, no annex
 * files. That heavy content stays on-demand via the existing `getAgent` IPC.
 * The body is parsed by `matter` solely to run `extractSubAgents`; it is never
 * stored on the summary.
 */

/** Resolve the user agents dir at call time (testable via process.env.HOME). */
function userAgentsDir(): string {
  const HOME = process.env.HOME || os.homedir();
  return path.join(HOME, ".claude", "agents");
}

/** Greps the body for `` `tw-…` `` backtick refs (replicates the reference readers). */
function extractSubAgents(body: string): string[] {
  const agents: string[] = [];
  const pattern = /`(tw-[\w-]+)`/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body)) !== null) {
    if (!agents.includes(match[1])) agents.push(match[1]);
  }
  return agents;
}

/**
 * Recursively scan a single agents dir into lightweight summaries.
 * Replicates `findAgentsInDir`/`countMdFiles`: walk recursively, skip any
 * directory named `memory`, parse each `.md` via gray-matter, skip files with
 * no `data.name`. Never throws — a missing dir contributes an empty list and a
 * malformed/`name`-less file is skipped.
 */
function scanDir(root: string, scope: AgentScope): AgentSummary[] {
  if (!fs.existsSync(root)) return [];
  const summaries: AgentSummary[] = [];

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
        if (entry.name === "memory") continue; // heavy content, on-demand only
        walk(full);
      } else if (entry.name.endsWith(".md")) {
        try {
          const raw = fs.readFileSync(full, "utf-8");
          const { data, content } = matter(raw);
          if (!data.name) continue;

          const fm = data as AgentFrontmatter;
          const relativePath = path.relative(root, full);
          const folder = path.dirname(relativePath);

          summaries.push({
            id: fm.name,
            scope,
            filePath: full,
            relativePath,
            folder: folder === "." ? "" : folder,
            frontmatter: fm,
            subAgents:
              Array.isArray(fm.subAgents) && fm.subAgents.length > 0
                ? fm.subAgents
                : extractSubAgents(content),
            shadowed: false, // the union sets the real value
          });
        } catch {
          // malformed file → skip (faithful-mirror rule)
        }
      }
    }
  }

  walk(root);
  return summaries;
}

/**
 * Read the union of user + project agents fresh from disk. No caching here.
 * Never throws: a missing dir yields an empty list for that scope.
 */
export function getAgents(projectPath?: string): AgentsSnapshot {
  const userSummaries = scanDir(userAgentsDir(), "user");
  const projectSummaries = projectPath
    ? scanDir(path.join(projectPath, ".claude", "agents"), "project")
    : [];
  const agents = unionAgents(userSummaries, projectSummaries);
  return { projectPath: projectPath ?? null, agents };
}

// --- Watch + debounced live broadcast --------------------------------------
//
// Added in Phase 3: recursive `fs.watch` on both agents dirs, a module-level
// RAM-only snapshot, a debounced recompute, a JSON.stringify diff guard, and a
// `broadcast({ type: 'agents_changed', snapshot })` only on actual change.
