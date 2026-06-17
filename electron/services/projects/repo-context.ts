import fs from "node:fs";
import path from "node:path";

/**
 * Gather a bounded, plain-text snapshot of a repo's identity for the Home-page
 * repo-label LLM run. Previously `claude --print` ran with `cwd = repo` and read
 * this context itself, but that wrote a `.jsonl` transcript into the scanned
 * project (phantom sessions). Now the label run executes in `os.tmpdir()`, so the
 * repo context must be collected here in Node and injected into the prompt.
 *
 * Every read is wrapped in `try/catch` and any missing/unreadable input degrades
 * to empty — the function must NEVER throw.
 */

const MAX_ENTRIES = 50;
const CLAUDE_MD_MAX_CHARS = 2000;
const EXCLUDED_TOP_LEVEL = new Set(["node_modules", ".git"]);

function safeListDir(dirPath: string): string[] {
  try {
    return fs.readdirSync(dirPath);
  } catch {
    return [];
  }
}

function topLevelEntries(repoPath: string): string[] {
  return safeListDir(repoPath)
    .filter((name) => !EXCLUDED_TOP_LEVEL.has(name))
    .slice(0, MAX_ENTRIES);
}

function claudeMdExcerpt(repoPath: string): string {
  try {
    const raw = fs.readFileSync(path.join(repoPath, "CLAUDE.md"), "utf-8");
    return raw.slice(0, CLAUDE_MD_MAX_CHARS);
  } catch {
    return "";
  }
}

function claudeDirEntries(repoPath: string): string[] {
  const claudeDir = path.join(repoPath, ".claude");
  try {
    const stat = fs.statSync(claudeDir);
    if (!stat.isDirectory()) return [];
  } catch {
    return [];
  }
  return safeListDir(claudeDir).slice(0, MAX_ENTRIES);
}

/**
 * Build a clearly-labeled plain-text context block for `repoPath`. Crash-safe and
 * bounded; returns an empty-ish string rather than throwing on any failure.
 */
export function buildRepoLabelContext(repoPath: string): string {
  const sections: string[] = [];

  const entries = topLevelEntries(repoPath);
  if (entries.length > 0) {
    sections.push(`Top-level files:\n${entries.join("\n")}`);
  }

  const excerpt = claudeMdExcerpt(repoPath);
  if (excerpt.length > 0) {
    sections.push(`CLAUDE.md (excerpt):\n${excerpt}`);
  }

  const claudeEntries = claudeDirEntries(repoPath);
  if (claudeEntries.length > 0) {
    sections.push(`.claude/ contents:\n${claudeEntries.join("\n")}`);
  }

  return sections.join("\n\n");
}
