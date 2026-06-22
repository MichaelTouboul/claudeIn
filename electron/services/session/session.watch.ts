import fs from "fs";
import path from "path";
import { broadcast } from "../core/broadcast";
import {
  contextFillToPercent,
  extractAssistantUsage,
  extractContextFill,
  extractResolvedModel,
  findResolvedModelInFile,
  getProjectsBase,
  resolveProjectModel,
} from "./session.transcript";

/**
 * Real-time session-activity watching. Tails each project's transcript files
 * and broadcasts `session_activity` as new assistant/user lines arrive. Split
 * out of `session.service` to keep both files under the 300-line limit; shares
 * the transcript helpers (`getProjectsBase`, `extractAssistantUsage`).
 *
 * It is ALSO the single live source of the per-session context %: as new
 * assistant turns arrive it recomputes the LAST-turn fill + window through the
 * SAME consolidated `session.transcript` math the persisted sidebar uses, and
 * broadcasts `session_context` keyed by `claudeSessionId`. The renderer never
 * computes a percent — both bars read this one backend value, so the live agent
 * bar and the sidebar row for a session render the identical number.
 */

function getSessionsDir(projectPath: string): string {
  const encoded = projectPath.replace(/\//g, "-");
  return path.join(getProjectsBase(), encoded);
}

const watchers = new Map<string, fs.FSWatcher>();
const fileOffsets = new Map<string, number>();
const sessionAgentCache = new Map<string, string>();
// A `[1m]` resolvedModel marker seen on ANY earlier line keeps pinning the
// window for later assistant turns (the marker and the usage live on different
// lines). Keyed by filePath (1:1 with claudeSessionId / the .jsonl name).
const fileResolvedModel = new Map<string, string>();
// The project's `.claude` model (window source of truth) resolved ONCE per
// watched project, keyed by the encoded sessions dir. Used as the per-session
// resolved-model fallback when a transcript carries no `[1m]` marker, so the
// live bar matches the persisted sidebar bar (both route through
// `resolveContextWindow`). A `null` resolve is stored too so we don't re-read.
const dirProjectModel = new Map<string, string | null>();

function getAgentForFile(filePath: string): string {
  if (sessionAgentCache.has(filePath)) return sessionAgentCache.get(filePath)!;

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").slice(0, 20);
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        if (obj.type === "agent-setting" && obj.agentSetting) {
          sessionAgentCache.set(filePath, obj.agentSetting);
          return obj.agentSetting;
        }
      } catch {}
    }
  } catch {}

  sessionAgentCache.set(filePath, "unknown");
  return "unknown";
}

export function startWatching(projectPath: string): void {
  const dir = getSessionsDir(projectPath);
  if (!fs.existsSync(dir)) return;
  if (watchers.has(dir)) return;

  // Resolve the project's window-source-of-truth model once for this watch.
  dirProjectModel.set(dir, resolveProjectModel(projectPath));

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
  for (const f of files) {
    const fp = path.join(dir, f);
    try {
      const stat = fs.statSync(fp);
      fileOffsets.set(fp, stat.size);
    } catch {}
    // One-time seed of the per-file window from any `[1m]` marker already on
    // disk. The tail below only re-reads APPENDED lines, so a marker written
    // before this watch started would otherwise never pin the 1M window and a
    // 1M session would mis-tier to 200k. Defensive: returns null, never throws.
    const seeded = findResolvedModelInFile(fp);
    if (seeded !== null) fileResolvedModel.set(fp, seeded);
  }

  const watcher = fs.watch(dir, (_, filename) => {
    if (!filename || !filename.endsWith(".jsonl")) return;
    const fp = path.join(dir, filename);

    try {
      const stat = fs.statSync(fp);
      const lastOffset = fileOffsets.get(fp) || 0;

      if (stat.size > lastOffset) {
        const stream = fs.createReadStream(fp, { start: lastOffset, encoding: "utf-8" });
        let buffer = "";

        stream.on("data", (chunk: string) => {
          buffer += chunk;
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              processNewLine(JSON.parse(line), fp);
            } catch {}
          }
        });

        stream.on("end", () => {
          fileOffsets.set(fp, stat.size);
        });
      } else if (lastOffset === 0) {
        fileOffsets.set(fp, stat.size);
      }
    } catch {}
  });

  watchers.set(dir, watcher);
}

function processNewLine(obj: Record<string, unknown>, filePath: string): void {
  const agentName = getAgentForFile(filePath);
  const sessionId = typeof obj.sessionId === "string" ? obj.sessionId : null;

  const usage = extractAssistantUsage(obj);
  if (usage) {
    broadcast({
      type: "session_activity",
      sessionId,
      agentName,
      tokensIn: usage.tokensIn,
      tokensOut: usage.tokensOut,
      model: usage.model ?? undefined,
    });
  }

  // Recompute the per-session context % from the SAME consolidated math the
  // sidebar uses, and push it keyed by claudeSessionId. A `[1m]` marker on any
  // line pins the window; otherwise the project's `.claude` model is the window
  // source of truth (a `[1m]` model pins the 1M window). The last assistant
  // turn's fill drives the percent.
  const resolved = extractResolvedModel(obj);
  if (resolved !== null) fileResolvedModel.set(filePath, resolved);
  const fill = extractContextFill(obj);
  if (fill !== null) {
    if (sessionId) {
      const projectModel = dirProjectModel.get(path.dirname(filePath)) ?? null;
      const effectiveModel = fileResolvedModel.get(filePath) ?? projectModel;
      const percent = contextFillToPercent(fill, effectiveModel);
      if (percent !== null) {
        broadcast({ type: "session_context", claudeSessionId: sessionId, percent });
      }
    }
  }

  if (obj.type === "user" && obj.promptId) {
    broadcast({
      type: "session_activity",
      sessionId,
      agentName,
      event: "user_prompt",
    });
  }
}

export function stopWatching(projectPath: string): void {
  const dir = getSessionsDir(projectPath);
  const watcher = watchers.get(dir);
  if (watcher) {
    watcher.close();
    watchers.delete(dir);
  }

  // Evict ONLY keys inside `dir`. A bare `startsWith(dir)` has no path boundary,
  // so stopping `…-tastewise` would also wipe the sibling `…-tastewise-teams-*`
  // caches. Match the dir exactly or a path strictly under it.
  const inDir = (key: string): boolean => key === dir || key.startsWith(dir + path.sep);
  for (const key of fileOffsets.keys()) {
    if (inDir(key)) fileOffsets.delete(key);
  }
  for (const key of sessionAgentCache.keys()) {
    if (inDir(key)) sessionAgentCache.delete(key);
  }
  for (const key of fileResolvedModel.keys()) {
    if (inDir(key)) fileResolvedModel.delete(key);
  }
  dirProjectModel.delete(dir);
}

/**
 * Test-only inspector: the current keys of the live `fileOffsets` cache. Lets a
 * regression test assert the `stopWatching` prefix boundary without exporting
 * the mutable Map itself. Not part of the runtime contract.
 */
export function __peekOffsetKeys(): string[] {
  return Array.from(fileOffsets.keys());
}

/**
 * Test-only inspector: a snapshot of the live `fileResolvedModel` cache (filePath
 * → resolvedModel). Lets a regression test assert `startWatching` seeded the
 * per-file `[1m]` marker from a pre-existing transcript. Not a runtime contract.
 */
export function __peekResolvedModel(): Record<string, string> {
  return Object.fromEntries(fileResolvedModel);
}
