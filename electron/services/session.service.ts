import fs from "fs";
import path from "path";
import readline from "readline";
import { extractAssistantUsage, getProjectsBase } from "./session.transcript";
import type { SessionStatus, SessionSummary, SessionConversation, SessionMessage } from "../types/session.types";

// Status is derived from how recently the transcript file was touched (mtime,
// surfaced as `lastActiveAt`). Snapshot "live" is approximate — the precise
// live signal is the tail receiving appends + (for piloted sessions) activeAgents.
export const LIVE_THRESHOLD_MS = 30_000; // < 30 s → live
export const RECENT_THRESHOLD_MS = 6 * 60 * 60 * 1000; // < 6 h → recent

export function deriveStatus(lastActiveAt: string | null, now: number = Date.now()): SessionStatus {
  if (!lastActiveAt) return "idle";
  const age = now - new Date(lastActiveAt).getTime();
  if (age < LIVE_THRESHOLD_MS) return "live";
  if (age < RECENT_THRESHOLD_MS) return "recent";
  return "idle";
}

function getSessionsDir(projectPath: string): string {
  const encoded = projectPath.replace(/\//g, "-");
  return path.join(getProjectsBase(), encoded);
}

// --- Metadata listing (lazy, first ~50 lines per file) ---

async function extractMetadata(filePath: string): Promise<Partial<SessionSummary>> {
  const meta: Partial<SessionSummary> = {};
  let lineCount = 0;

  return new Promise((resolve) => {
    const stream = fs.createReadStream(filePath, { encoding: "utf-8" });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    rl.on("line", (line) => {
      lineCount++;
      try {
        const obj = JSON.parse(line);
        if (obj.type === "ai-title" && obj.aiTitle) meta.title = obj.aiTitle;
        if (obj.type === "agent-setting" && obj.agentSetting) meta.agentName = obj.agentSetting;
        if (obj.type === "user" && obj.promptId && !meta.firstPrompt) {
          const content = obj.message?.content;
          if (typeof content === "string") {
            meta.firstPrompt = content.length > 120 ? content.slice(0, 120) + "…" : content;
          }
          if (obj.timestamp && !meta.startedAt) meta.startedAt = obj.timestamp;
          if (obj.gitBranch && !meta.branch) meta.branch = obj.gitBranch;
        }
        if (obj.type === "assistant" && obj.message?.model && !meta.model) {
          meta.model = obj.message.model;
        }
      } catch {}
      if (lineCount >= 50) {
        rl.close();
        stream.destroy();
      }
    });

    rl.on("close", () => resolve(meta));
    rl.on("error", () => resolve(meta));
  });
}

export async function listSessions(projectPath: string): Promise<SessionSummary[]> {
  const dir = getSessionsDir(projectPath);
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
  const summaries: SessionSummary[] = [];

  for (const entry of entries) {
    const filePath = path.join(dir, entry);
    const sessionId = entry.replace(".jsonl", "");

    let stat: fs.Stats;
    try {
      stat = fs.statSync(filePath);
    } catch {
      continue;
    }

    const meta = await extractMetadata(filePath);
    const lastActiveAt = stat.mtime.toISOString();

    summaries.push({
      sessionId,
      filePath,
      agentName: meta.agentName || null,
      title: meta.title || null,
      firstPrompt: meta.firstPrompt || null,
      messageCount: Math.max(1, Math.round(stat.size / 500)),
      branch: meta.branch || null,
      startedAt: meta.startedAt || null,
      lastActiveAt,
      model: meta.model || null,
      projectDirName: path.basename(dir),
      status: deriveStatus(lastActiveAt),
    });
  }

  return summaries.sort((a, b) => {
    const ta = a.lastActiveAt || "";
    const tb = b.lastActiveAt || "";
    return tb.localeCompare(ta);
  });
}

// --- Conversation loading (on demand) ---

export async function loadConversation(filePath: string): Promise<SessionConversation> {
  const sessionId = path.basename(filePath, ".jsonl");
  const messages: SessionMessage[] = [];
  let totalTokensIn = 0;
  let totalTokensOut = 0;
  let model: string | null = null;

  return new Promise((resolve) => {
    if (!fs.existsSync(filePath)) {
      resolve({ sessionId, messages, totalTokensIn, totalTokensOut, model });
      return;
    }
    const stream = fs.createReadStream(filePath, { encoding: "utf-8" });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    const pendingToolNames: string[] = [];

    rl.on("line", (line) => {
      try {
        const obj = JSON.parse(line);

        if (obj.type === "user" && obj.promptId && obj.message) {
          const content = obj.message.content;
          if (typeof content === "string") {
            messages.push({
              role: "user",
              content,
              timestamp: obj.timestamp || "",
              uuid: obj.uuid || "",
            });
          }
        }

        if (obj.type === "assistant" && obj.message) {
          const contentArr = obj.message.content || [];
          const textParts: string[] = [];
          const toolNames: string[] = [];

          for (const c of contentArr) {
            if (c.type === "text" && c.text) textParts.push(c.text);
            if (c.type === "tool_use" && c.name) toolNames.push(c.name);
          }

          const usage = extractAssistantUsage(obj);
          const tokensIn = usage?.tokensIn || 0;
          const tokensOut = usage?.tokensOut || 0;

          if (textParts.length > 0 || toolNames.length > 0) {
            totalTokensIn += tokensIn;
            totalTokensOut += tokensOut;
            if (obj.message.model && !model) model = obj.message.model;
          }

          if (textParts.length === 0 && toolNames.length > 0) {
            // Tool-only turn — accumulate, do not emit a message
            pendingToolNames.push(...toolNames);
          } else if (textParts.length > 0) {
            // Text turn — attach any accumulated tool names from prior tool-only turns
            const combinedTools = [...pendingToolNames, ...toolNames];
            pendingToolNames.length = 0;
            messages.push({
              role: "assistant",
              content: textParts.join("\n"),
              timestamp: obj.timestamp || "",
              uuid: obj.uuid || "",
              model: obj.message.model,
              tokensIn,
              tokensOut,
              toolNames: combinedTools.length > 0 ? combinedTools : undefined,
            });
          }
        }
      } catch {}
    });

    rl.on("close", () => {
      if (pendingToolNames.length > 0) {
        messages.push({
          role: "assistant",
          content: "",
          timestamp: "",
          uuid: "",
          toolNames: pendingToolNames,
        });
      }
      resolve({ sessionId, messages, totalTokensIn, totalTokensOut, model });
    });
    rl.on("error", (_err) => {
      resolve({ sessionId, messages, totalTokensIn, totalTokensOut, model });
    });
  });
}

// --- File watching (real-time activity detection) ---
// Implemented in `session.watch.ts`; re-exported here so existing importers
// (`sessions.ipc`) keep their `sessionService.startWatching` callsite.
export { startWatching, stopWatching } from "./session.watch";
