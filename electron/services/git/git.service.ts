import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import {
  DiffMode,
  FileStatus,
  GitLineKind,
  type RepoDiff,
  type RepoFileDiff,
} from "../../types/git.types";
import { parseUnifiedDiff } from "./git.parse";

const run = promisify(execFile);
const TIMEOUT = 10_000;
const MAX_BUFFER = 16 * 1024 * 1024;

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await run("git", args, { cwd, timeout: TIMEOUT, maxBuffer: MAX_BUFFER });
  return stdout;
}

async function isGitRepo(cwd: string): Promise<boolean> {
  try {
    return (await git(cwd, ["rev-parse", "--is-inside-work-tree"])).trim() === "true";
  } catch {
    return false;
  }
}

/** Untracked files → synthesized `added` RepoFileDiff entries (read-only). */
function untrackedAdds(cwd: string, list: string): RepoFileDiff[] {
  return list
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((rel) => {
      let body = "";
      try {
        body = fs.readFileSync(path.join(cwd, rel), "utf-8");
      } catch {
        /* binary/unreadable */
      }
      const lines = body.length ? body.replace(/\n$/, "").split("\n") : [];
      return {
        path: rel,
        status: FileStatus.Added,
        additions: lines.length,
        deletions: 0,
        binary: false,
        hunks: lines.length
          ? [
              {
                header: `@@ -0,0 +1,${lines.length} @@`,
                lines: [
                  {
                    kind: GitLineKind.Hunk,
                    text: `@@ -0,0 +1,${lines.length} @@`,
                    oldLine: null,
                    newLine: null,
                  },
                  ...lines.map((t, i) => ({
                    kind: GitLineKind.Add,
                    text: t,
                    oldLine: null,
                    newLine: i + 1,
                  })),
                ],
              },
            ]
          : [],
      };
    });
}

async function defaultBase(cwd: string): Promise<string | null> {
  for (const ref of ["origin/HEAD", "main", "master"]) {
    try {
      const out = (await git(cwd, ["rev-parse", "--abbrev-ref", ref])).trim();
      if (out) return out.replace(/^origin\//, "");
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function loadRepoDiff(repoPath: string, mode: DiffMode): Promise<RepoDiff> {
  if (!(await isGitRepo(repoPath))) {
    return { mode, files: [], truncated: false, error: "Not a git repository" };
  }
  try {
    if (mode === DiffMode.Working) {
      const raw = await git(repoPath, ["diff", "HEAD"]);
      const parsed = parseUnifiedDiff(raw);
      const untracked = await git(repoPath, ["ls-files", "--others", "--exclude-standard"]);
      return {
        mode,
        files: [...parsed.files, ...untrackedAdds(repoPath, untracked)],
        truncated: parsed.truncated,
      };
    }
    const base = await defaultBase(repoPath);
    if (!base) return { mode, files: [], truncated: false, error: "No base branch found" };
    const mergeBase = (await git(repoPath, ["merge-base", "HEAD", base])).trim();
    const raw = await git(repoPath, ["diff", `${mergeBase}...HEAD`]);
    const parsed = parseUnifiedDiff(raw);
    return { mode, base, files: parsed.files, truncated: parsed.truncated };
  } catch (err) {
    return {
      mode,
      files: [],
      truncated: false,
      error: err instanceof Error ? err.message : "git failed",
    };
  }
}
