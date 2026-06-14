import { promises as fsp } from "fs";
import os from "os";
import path from "path";

import type { ImproveRequest } from "../../types/improve.types";

/**
 * Pure filesystem read/parse/write helpers for the Self-Improve inbox. The
 * inbox dir (`~/.claude-agent-manager/improve-inbox/`) holds one `<id>.json`
 * per request and is the single source of truth. HOME is resolved at call time
 * (`process.env.HOME || os.homedir()`) so tests can point at a temp dir — never
 * the user's real home. Split out of `improve-inbox.service` to keep both files
 * under the 300-line limit.
 */

/** Resolve the inbox dir at call time (testable via process.env.HOME). */
export function getInboxDir(): string {
  const home = process.env.HOME || os.homedir();
  return path.join(home, ".claude-agent-manager", "improve-inbox");
}

/** Absolute path of a request's JSON file. */
export function requestFilePath(id: string): string {
  return path.join(getInboxDir(), `${id}.json`);
}

/** Create the inbox dir if it doesn't exist yet (idempotent). */
export async function ensureInboxDir(): Promise<void> {
  await fsp.mkdir(getInboxDir(), { recursive: true });
}

/** Write a request to its file, pretty-printed (atomic enough for local use). */
export async function writeRequest(request: ImproveRequest): Promise<void> {
  await ensureInboxDir();
  const file = requestFilePath(request.id);
  await fsp.writeFile(file, `${JSON.stringify(request, null, 2)}\n`, "utf-8");
}

/** Read + parse a single request file. Returns null on missing/invalid JSON. */
export async function readRequest(id: string): Promise<ImproveRequest | null> {
  try {
    const raw = await fsp.readFile(requestFilePath(id), "utf-8");
    return JSON.parse(raw) as ImproveRequest;
  } catch {
    return null;
  }
}

/** Read + parse the request given an absolute file path (used by the watcher). */
export async function readRequestFile(file: string): Promise<ImproveRequest | null> {
  try {
    const raw = await fsp.readFile(file, "utf-8");
    return JSON.parse(raw) as ImproveRequest;
  } catch {
    return null;
  }
}

/** Read + parse every `*.json` in the inbox. Skips unreadable/invalid files. */
export async function readAllRequests(): Promise<ImproveRequest[]> {
  let names: string[];
  try {
    names = await fsp.readdir(getInboxDir());
  } catch {
    return []; // dir missing → empty inbox, never throw
  }

  const requests: ImproveRequest[] = [];
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    const parsed = await readRequestFile(path.join(getInboxDir(), name));
    if (parsed) requests.push(parsed);
  }
  return requests;
}
