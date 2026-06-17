import fs from "node:fs";
import path from "node:path";

/**
 * Gather a bounded, plain-text snapshot of a scope's `.claude` setup for the
 * scope-profile LLM run. Previously `claude --print` ran with `cwd = scopePath`
 * and explored the `.claude` dir itself, but that wrote a `.jsonl` transcript
 * into the scanned project (phantom sessions). Now the profile run executes in
 * `os.tmpdir()`, so the scope context must be collected here in Node and injected
 * into the prompt — mirroring `buildRepoLabelContext`.
 *
 * Every read is wrapped in `try/catch` and any missing/unreadable input degrades
 * to empty — the function must NEVER throw.
 */

const MAX_ENTRIES = 50;
const CLAUDE_MD_MAX_CHARS = 2000;
const SETTINGS_MAX_CHARS = 4000;

function safeListDir(dirPath: string): string[] {
  try {
    return fs.readdirSync(dirPath).slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

function safeReadFile(filePath: string, maxChars: number): string {
  try {
    return fs.readFileSync(filePath, "utf-8").slice(0, maxChars);
  } catch {
    return "";
  }
}

function claudeSubdir(scopePath: string, sub: string): string[] {
  return safeListDir(path.join(scopePath, ".claude", sub));
}

function claudeMdExcerpt(scopePath: string): string {
  const direct = safeReadFile(path.join(scopePath, "CLAUDE.md"), CLAUDE_MD_MAX_CHARS);
  if (direct.length > 0) return direct;
  return safeReadFile(path.join(scopePath, ".claude", "CLAUDE.md"), CLAUDE_MD_MAX_CHARS);
}

/**
 * Build a clearly-labeled plain-text context block for `scopePath`'s `.claude`
 * setup, plus the detected other-plugin data dirs (`plugins`). Crash-safe and
 * bounded; pushes a section only when it has content (mirrors
 * `buildRepoLabelContext`). Returns an empty-ish string rather than throwing.
 */
export function buildScopeContext(scopePath: string, plugins: string[]): string {
  const sections: string[] = [];

  const agents = claudeSubdir(scopePath, "agents");
  if (agents.length > 0) {
    sections.push(`.claude/agents:\n${agents.join("\n")}`);
  }

  const skills = claudeSubdir(scopePath, "skills");
  if (skills.length > 0) {
    sections.push(`.claude/skills:\n${skills.join("\n")}`);
  }

  const hooks = claudeSubdir(scopePath, "hooks");
  if (hooks.length > 0) {
    sections.push(`.claude/hooks:\n${hooks.join("\n")}`);
  }

  const settings = safeReadFile(
    path.join(scopePath, ".claude", "settings.json"),
    SETTINGS_MAX_CHARS
  );
  if (settings.length > 0) {
    sections.push(`.claude/settings.json:\n${settings}`);
  }

  const localSettings = safeReadFile(
    path.join(scopePath, ".claude", "settings.local.json"),
    SETTINGS_MAX_CHARS
  );
  if (localSettings.length > 0) {
    sections.push(`.claude/settings.local.json:\n${localSettings}`);
  }

  const excerpt = claudeMdExcerpt(scopePath);
  if (excerpt.length > 0) {
    sections.push(`CLAUDE.md (excerpt):\n${excerpt}`);
  }

  if (plugins.length > 0) {
    sections.push(`Other-plugin data dirs:\n${plugins.slice(0, MAX_ENTRIES).join("\n")}`);
  }

  return sections.join("\n\n");
}
