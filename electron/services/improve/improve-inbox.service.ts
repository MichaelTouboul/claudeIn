import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

import { broadcast } from "../core/broadcast";
import {
  copyImagesForRequest,
  ensureInboxDir,
  getInboxDir,
  readAllRequests,
  readRequest,
  readRequestFile,
  writeRequest,
} from "./improve-inbox.io";
import {
  ImproveStatus,
  type ImproveRequest,
  type ImproveRequestInput,
  type ImproveStatusPatch,
} from "../../types/improve.types";

/**
 * Self-Improve inbox (I1). Persists each request as one `<id>.json` in
 * `~/.claude-agent-manager/improve-inbox/` — the file on disk is the single
 * source of truth. A `/loop` watcher (see `docs/self-improve/runner-contract.md`)
 * consumes pending requests and writes back a terminal status via the same
 * files. Watching mirrors `session.watch.ts`: an `fs.watch` per dir that
 * re-reads the changed file and broadcasts the parsed request, so the renderer
 * never holds stale state.
 */

const CHANGE_EVENT = "improve_request_changed";

/** Submit a new request: mint id + createdAt, persist as `pending`, return it. */
export async function submitRequest(input: ImproveRequestInput): Promise<ImproveRequest> {
  const id = randomUUID();
  // Snapshot attached screenshots into a durable, request-scoped dir before
  // persisting, so they outlive os.tmpdir() cleanup and the runner can Read them.
  const images = await copyImagesForRequest(id, input.images ?? []);
  const request: ImproveRequest = {
    id,
    createdAt: new Date().toISOString(),
    type: input.type,
    component: input.component,
    sourcePath: input.sourcePath,
    title: input.title,
    description: input.description,
    acceptance: input.acceptance,
    transcript: input.transcript ?? [],
    ...(images.length > 0 ? { images } : {}),
    status: ImproveStatus.Pending,
  };

  await writeRequest(request);
  return request;
}

/** All requests, newest first (sorted by `createdAt` descending). */
export async function listRequests(): Promise<ImproveRequest[]> {
  const requests = await readAllRequests();
  return requests.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** A single request by id, or null if it doesn't exist / is unreadable. */
export async function getRequest(id: string): Promise<ImproveRequest | null> {
  return readRequest(id);
}

/**
 * Merge `patch` into the stored request and persist. Returns the updated
 * request, or null if the id doesn't exist. The runner uses this to claim a
 * request (`in_progress` + `claimedAt`) and then mark it `merged`/`failed`;
 * exposed so tests can simulate the runner.
 */
export async function updateStatus(
  id: string,
  patch: ImproveStatusPatch,
): Promise<ImproveRequest | null> {
  const existing = await readRequest(id);
  if (!existing) return null;

  const updated: ImproveRequest = { ...existing, ...patch };
  await writeRequest(updated);
  return updated;
}

// --- Watching --------------------------------------------------------------

let watcher: fs.FSWatcher | null = null;

/** Re-read a changed inbox file and broadcast its parsed request. */
async function emitChange(file: string): Promise<void> {
  const request = await readRequestFile(file);
  if (!request) return; // mid-write / deleted / invalid → skip, never throw
  broadcast({ type: CHANGE_EVENT, request });
}

/**
 * Watch the inbox dir; broadcast `improve_request_changed` (with the parsed
 * request) on every add/change. Re-entrant: a second call replaces any
 * existing watch. Mirrors `session.watch.ts`.
 */
export async function watchInbox(): Promise<void> {
  unwatchInbox();
  await ensureInboxDir();

  const dir = getInboxDir();
  try {
    watcher = fs.watch(dir, (_event, filename) => {
      if (!filename || !filename.endsWith(".json")) return;
      void emitChange(path.join(dir, filename));
    });
  } catch {
    // Watching can fail (perms, transient); skip rather than throw.
    watcher = null;
  }
}

/** Stop watching the inbox dir. */
export function unwatchInbox(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}
