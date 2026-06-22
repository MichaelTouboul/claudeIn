import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { broadcast } from "../core/broadcast";
import type { GitBranchInfo } from "../../types/git.types";
import { loadGitBranchInfo } from "./git.service";

/**
 * Live branch watching for the composer status strip. The displayed branch must
 * update whenever HEAD moves — whether the USER ran an external `git checkout`, or
 * CLAUDE switched/created a worktree mid-session. We watch the directory holding
 * the repo's HEAD ref file and re-query `loadGitBranchInfo` on each change,
 * broadcasting `git:branch-changed` (keyed by repoPath) only when the branch name
 * actually differs from the last-seen value (diff guard).
 *
 * HEAD lives at a different path for a linked worktree than the main checkout, so
 * we resolve it via `git rev-parse --git-path HEAD` (absolute), then watch its
 * parent dir and filter by filename — more reliable on macOS than watching the
 * file inode directly (git replaces HEAD on checkout). Best-effort: any failure to
 * locate/watch silently no-ops rather than throwing.
 */

const run = promisify(execFile);
const CHANGE_EVENT = "git:branch-changed";

type Watch = { watcher: fs.FSWatcher; lastBranch: string | null };

const watches = new Map<string, Watch>();

async function resolveHeadPath(repoPath: string): Promise<string | null> {
  try {
    const { stdout } = await run("git", ["rev-parse", "--git-path", "HEAD"], {
      cwd: repoPath,
      timeout: 10_000,
    });
    const rel = stdout.trim();
    if (!rel) return null;
    return path.isAbsolute(rel) ? rel : path.resolve(repoPath, rel);
  } catch {
    return null;
  }
}

async function emitIfChanged(repoPath: string): Promise<void> {
  const entry = watches.get(repoPath);
  if (!entry) return;
  const info: GitBranchInfo = await loadGitBranchInfo(repoPath);
  if (info.current === entry.lastBranch) return; // unchanged → skip
  entry.lastBranch = info.current;
  broadcast({ type: CHANGE_EVENT, repoPath, info });
}

/**
 * Start watching `repoPath`'s HEAD for branch changes. Re-entrant per repo: a
 * second call replaces the existing watch. Seeds the last-seen branch from the
 * current state so the initial value never broadcasts. Never throws.
 */
export async function watchGitBranch(repoPath: string): Promise<void> {
  await unwatchGitBranch(repoPath);

  const headPath = await resolveHeadPath(repoPath);
  if (!headPath) return;

  // Seed the last-seen branch so the first real change is what broadcasts.
  const seeded = await loadGitBranchInfo(repoPath);

  const dir = path.dirname(headPath);
  const base = path.basename(headPath);
  try {
    const watcher = fs.watch(dir, (_event, filename) => {
      if (filename && filename !== base) return;
      void emitIfChanged(repoPath);
    });
    watches.set(repoPath, { watcher, lastBranch: seeded.current });
  } catch {
    // Watching can fail (perms, transient) — skip rather than throw.
  }
}

/** Stop watching `repoPath`'s HEAD. Idempotent; safe if no watch is active. */
export async function unwatchGitBranch(repoPath: string): Promise<void> {
  const entry = watches.get(repoPath);
  if (entry) {
    entry.watcher.close();
    watches.delete(repoPath);
  }
}
