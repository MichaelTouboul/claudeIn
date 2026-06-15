import fs from "fs";
import { broadcast } from "../core/broadcast";
import { getMemory } from "./memory.mirror";
import { detectImports, firstNonEmptyLine } from "./memory.summarize";
import type { MemoryEntry } from "../../types/memory-mirror.types";

/**
 * Path-based read/write for the memory mirror. The mirror itself
 * (`memory.mirror.ts`) exposes per-file METADATA (size, firstLine, hasImports)
 * but never a body and has no read/write-by-path — this module adds exactly
 * that, scoped to the files the mirror already surfaces.
 *
 * SAFETY (non-negotiable): every read/write first resolves the current mirror
 * snapshot for the same `projectPath` and rejects any `path` that is NOT a
 * member of it. We never read or write an arbitrary filesystem path, and we
 * never create new files — only edit the existing memory files the mirror lists.
 * This keeps the editing surface identical to the viewing surface.
 */

/** Resolve the mirror entry for `filePath`, or throw if it is not a member. */
function requireMirrorEntry(filePath: string, projectPath?: string): MemoryEntry {
  const snapshot = getMemory(projectPath);
  const entry = snapshot.entries.find((e) => e.path === filePath);
  if (!entry) {
    throw new Error(
      `Refusing to access ${filePath}: not a memory file in the current scope.`,
    );
  }
  return entry;
}

/** Build a fresh MemoryEntry for a path known to be a mirror member. */
function entryFor(
  filePath: string,
  source: MemoryEntry["source"],
  scope: MemoryEntry["scope"],
): MemoryEntry {
  const stat = fs.statSync(filePath);
  const text = fs.readFileSync(filePath, "utf-8");
  return {
    source,
    path: filePath,
    scope,
    size: stat.size,
    firstLine: firstNonEmptyLine(text),
    hasImports: detectImports(text),
  };
}

/**
 * Read the full UTF-8 text of a memory file. Rejects any path the mirror does
 * not currently surface for `projectPath`.
 */
export function readMemoryFile(filePath: string, projectPath?: string): string {
  requireMirrorEntry(filePath, projectPath);
  return fs.readFileSync(filePath, "utf-8");
}

/**
 * Atomically overwrite an existing memory file (tmp + rename), re-broadcast the
 * refreshed mirror snapshot, and return the refreshed entry. Rejects any path
 * the mirror does not currently surface — never creates a new file.
 */
export function writeMemoryFile(
  filePath: string,
  content: string,
  projectPath?: string,
): MemoryEntry {
  const before = requireMirrorEntry(filePath, projectPath);

  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, content, "utf-8");
  try {
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      // best-effort cleanup of the temp file
    }
    throw err;
  }

  // Re-emit the same memory-changed push the watcher uses so every live UI
  // (mirror panes, drawers) refreshes off the new body.
  broadcast({ type: "memory_changed", snapshot: getMemory(projectPath) });

  return entryFor(filePath, before.source, before.scope);
}
