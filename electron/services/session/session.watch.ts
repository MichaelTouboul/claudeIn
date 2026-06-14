import fs from "fs";
import path from "path";
import { broadcast } from "../core/broadcast";
import { extractAssistantUsage, getProjectsBase } from "./session.transcript";

/**
 * Real-time session-activity watching. Tails each project's transcript files
 * and broadcasts `session_activity` as new assistant/user lines arrive. Split
 * out of `session.service` to keep both files under the 300-line limit; shares
 * the transcript helpers (`getProjectsBase`, `extractAssistantUsage`).
 */

function getSessionsDir(projectPath: string): string {
  const encoded = projectPath.replace(/\//g, "-");
  return path.join(getProjectsBase(), encoded);
}

const watchers = new Map<string, fs.FSWatcher>();
const fileOffsets = new Map<string, number>();
const sessionAgentCache = new Map<string, string>();

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

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
  for (const f of files) {
    const fp = path.join(dir, f);
    try {
      const stat = fs.statSync(fp);
      fileOffsets.set(fp, stat.size);
    } catch {}
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

  for (const key of fileOffsets.keys()) {
    if (key.startsWith(dir)) fileOffsets.delete(key);
  }
  for (const key of sessionAgentCache.keys()) {
    if (key.startsWith(dir)) sessionAgentCache.delete(key);
  }
}
