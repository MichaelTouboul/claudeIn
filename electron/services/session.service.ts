import fs from "fs";
import path from "path";
import readline from "readline";
import { broadcast } from "./broadcast";
import type { SessionSummary, SessionConversation, SessionMessage } from "../types/session.types";

const HOME = process.env.HOME || require("os").homedir();
const PROJECTS_BASE = path.join(HOME, ".claude", "projects");

function getSessionsDir(projectPath: string): string {
  const encoded = projectPath.replace(/\//g, "-");
  return path.join(PROJECTS_BASE, encoded);
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

    summaries.push({
      sessionId,
      filePath,
      agentName: meta.agentName || null,
      title: meta.title || null,
      firstPrompt: meta.firstPrompt || null,
      messageCount: Math.max(1, Math.round(stat.size / 500)),
      branch: meta.branch || null,
      startedAt: meta.startedAt || null,
      lastActiveAt: stat.mtime.toISOString(),
      model: meta.model || null,
      projectDirName: path.basename(dir),
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
    const stream = fs.createReadStream(filePath, { encoding: "utf-8" });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

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

          if (textParts.length > 0 || toolNames.length > 0) {
            const usage = obj.message.usage;
            const tokensIn = usage?.input_tokens || 0;
            const tokensOut = usage?.output_tokens || 0;
            totalTokensIn += tokensIn;
            totalTokensOut += tokensOut;

            if (obj.message.model && !model) model = obj.message.model;

            messages.push({
              role: "assistant",
              content: textParts.join("\n") || `[tools: ${toolNames.join(", ")}]`,
              timestamp: obj.timestamp || "",
              uuid: obj.uuid || "",
              model: obj.message.model,
              tokensIn,
              tokensOut,
              toolNames: toolNames.length > 0 ? toolNames : undefined,
            });
          }
        }
      } catch {}
    });

    rl.on("close", () => {
      resolve({ sessionId, messages, totalTokensIn, totalTokensOut, model });
    });
    rl.on("error", () => {
      resolve({ sessionId, messages, totalTokensIn, totalTokensOut, model });
    });
  });
}

// --- File watching (real-time activity detection) ---

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
  const sessionId = (obj as any).sessionId || null;

  if (obj.type === "assistant" && (obj as any).message) {
    const msg = (obj as any).message;
    const usage = msg.usage;
    broadcast({
      type: "session_activity",
      sessionId,
      agentName,
      tokensIn: usage?.input_tokens || 0,
      tokensOut: usage?.output_tokens || 0,
      model: msg.model || undefined,
    });
  }

  if (obj.type === "user" && (obj as any).promptId) {
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
