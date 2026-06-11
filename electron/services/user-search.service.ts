import fs from "fs";
import os from "os";
import path from "path";

import { getAgents } from "./agents.mirror";
import { getSkillsMirror } from "./skills.mirror";
import { getMcp } from "./mcp.mirror";
import { getSettings } from "./settings.service";
import { buildUserPrompt, parseNarrative } from "./user-search.narrative";
import { USER_SEARCH_COMMAND, runUserSearch } from "./user-search.runner";
import { defaultUserProfile } from "./user-profile.map";
import type { Capabilities, UserProfile } from "../types/user.interface";

export { setUserSearchRunner } from "./user-search.runner";

/**
 * User-scope discovery: deterministically locate the user `.claude` dir, then
 * fill a `UserProfile` from the existing mirror services (counts) plus a
 * `claude --print` narrative (summary/domains/workflow) via the runner seam.
 * Persistence lives in `user-profile.service`; this module only builds the
 * profile object.
 */

function home(): string {
  return process.env.HOME || os.homedir();
}

/** Candidate user `.claude` locations, checked in order. */
function candidatePaths(): string[] {
  const h = home();
  return [path.join(h, ".claude"), path.join(h, ".config", "claude")];
}

/**
 * Locate the user-scope `.claude` directory: prefer `$HOME/.claude`, then a small
 * fallback list. Returns the first existing path, or `null` when none is found
 * (the UI then asks the user to point to it).
 */
export function locateClaudeUser(): string | null {
  for (const candidate of candidatePaths()) {
    try {
      if (fs.statSync(candidate).isDirectory()) return candidate;
    } catch {
      // missing / unreadable → try next
    }
  }
  return null;
}

/** Count hooks declared in the effective settings (number of hook events). */
function countHooks(): number {
  const hooks = getSettings().effective.hooks;
  if (hooks && typeof hooks === "object" && !Array.isArray(hooks)) {
    return Object.keys(hooks).length;
  }
  return 0;
}

/** Read capability counts from the user-scope mirror services. */
function readCapabilities(): Capabilities {
  const agents = getAgents().agents;
  return {
    agents: { count: agents.length, names: agents.map((a) => a.id) },
    skills: getSkillsMirror().skills.length,
    mcp: getMcp().servers.length,
    hooks: countHooks(),
  };
}

/**
 * Build a `UserProfile` for the located `.claude` path: deterministic counts via
 * the mirror services + an LLM narrative via the runner seam. Does NOT persist —
 * the caller decides when to save. The runner is stubbed in tests, so no real
 * `claude` / network is invoked.
 */
export async function fillUserProfile(claudePath: string): Promise<UserProfile> {
  const capabilities = readCapabilities();
  const raw = await runUserSearch({
    command: USER_SEARCH_COMMAND,
    cwd: claudePath,
    prompt: buildUserPrompt([]),
  });
  const narrative = parseNarrative(raw);
  const now = new Date().toISOString();

  return {
    ...defaultUserProfile(),
    claudeUserPath: claudePath,
    capabilities,
    summary: narrative.summary,
    domains: narrative.domains,
    workflow: narrative.workflow,
    generatedAt: now,
    updatedAt: now,
  };
}
