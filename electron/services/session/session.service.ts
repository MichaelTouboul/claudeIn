import fs from "fs";
import path from "path";
import readline from "readline";
import {
  compareSessionsForList,
  contextFillToPercent,
  extractAssistantUsage,
  extractContextFill,
  extractResolvedModel,
  getProjectsBase,
  resolveProjectModel,
} from "./session.transcript";
import { isPhantomHelperTranscript, type PhantomSignals } from "./session.phantom";
import { getMeta, listMeta, type ConversationMeta } from "../conversation/conversation.meta";
import type { SessionStatus, SessionSummary, SessionConversation, SessionMessage } from "../../types/session.types";

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

// Phantom signals (`PhantomSignals` from `session.phantom`) are collected in the
// SAME single pass as `meta` so phantom helper transcripts can be filtered
// without a second read. They are internal only — never serialized to the
// renderer (`SessionSummary` is unchanged).

// Header metadata (title/agent/branch/firstPrompt/model) lives in the first
// lines, so it is captured only while `lineCount < 50`. The context-window fill,
// by contrast, is the LAST assistant turn's usage — so we keep streaming to EOF
// and track the most recent fill (cheap per-line work, mirrors activity.service
// reading whole transcripts). The percentage is clamped to 0–100; `null` when
// no assistant usage was ever seen → the row omits the context bar gracefully.
// In the same pass we collect `phantomSignals` (distinct top-level types, user
// turn count, untruncated first user prompt) so phantom helper transcripts can
// be filtered without a second read.
async function extractMetadata(
  filePath: string,
  projectModel: string | null = null
): Promise<{ meta: Partial<SessionSummary>; phantomSignals: PhantomSignals }> {
  const meta: Partial<SessionSummary> = {};
  const phantomSignals: PhantomSignals = {
    types: new Set<string>(),
    userTurnCount: 0,
    firstUserPrompt: null,
  };
  let lineCount = 0;
  let lastContextFill: number | null = null;
  // Track the most recent `[1m]`-bearing resolvedModel across the whole
  // transcript so a session that ever resolved to the 1M window is pinned to it
  // (the marker appears only incidentally on some lines).
  let lastResolvedModel: string | null = null;

  return new Promise((resolve) => {
    const stream = fs.createReadStream(filePath, { encoding: "utf-8" });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    rl.on("line", (line) => {
      lineCount++;
      try {
        const obj = JSON.parse(line);
        if (typeof obj.type === "string") phantomSignals.types.add(obj.type);
        if (obj.type === "user" && obj.promptId) {
          phantomSignals.userTurnCount++;
          const content = obj.message?.content;
          if (typeof content === "string" && phantomSignals.firstUserPrompt === null) {
            phantomSignals.firstUserPrompt = content;
          }
        }
        if (lineCount <= 50) {
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
        }
        const fill = extractContextFill(obj);
        if (fill !== null) lastContextFill = fill;
        const resolved = extractResolvedModel(obj);
        if (resolved !== null) lastResolvedModel = resolved;
      } catch {}
    });

    // The transcript marker (rarely present) wins; otherwise the project's
    // `.claude` model is the source of truth for the window (a `[1m]` model pins
    // the session to the 1M window). See `resolveProjectModel`.
    const effectiveModel = lastResolvedModel ?? projectModel;
    rl.on("close", () => {
      meta.contextPercent = contextFillToPercent(lastContextFill, effectiveModel);
      resolve({ meta, phantomSignals });
    });
    rl.on("error", () => {
      meta.contextPercent = contextFillToPercent(lastContextFill, effectiveModel);
      resolve({ meta, phantomSignals });
    });
  });
}

export async function listSessions(projectPath: string): Promise<SessionSummary[]> {
  const dir = getSessionsDir(projectPath);
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
  const summaries: SessionSummary[] = [];

  // The project's `.claude` model is the window source of truth for every
  // session in it (resolved once per listing). A model ending in `[1m]` pins the
  // 1M window when a transcript carries no explicit marker.
  const projectModel = resolveProjectModel(projectPath);

  // LEFT-JOIN equivalent: app-owned annotations from the DB, keyed by sessionId.
  // sql.js is synchronous; listMeta() already try/catches a missing/corrupt table.
  const metaById = new Map<string, ConversationMeta>();
  for (const m of listMeta()) metaById.set(m.sessionId, m);

  for (const entry of entries) {
    const filePath = path.join(dir, entry);
    const sessionId = entry.replace(".jsonl", "");

    // Hide soft-deleted conversations from the normal lists (still on disk).
    const cmeta = metaById.get(sessionId);
    if (cmeta?.deletedAt) continue;

    let stat: fs.Stats;
    try {
      stat = fs.statSync(filePath);
    } catch {
      continue;
    }

    const { meta, phantomSignals } = await extractMetadata(filePath, projectModel);

    // Skip phantom one-shot `--print` helper transcripts (e.g. repo-label /
    // scope-profile runs that landed in a scanned project's dir). A real
    // interactive conversation always carries interactive-metadata lines and/or
    // multiple user turns, so this never hides a genuine session.
    if (isPhantomHelperTranscript(phantomSignals)) continue;

    const lastActiveAt = stat.mtime.toISOString();

    summaries.push({
      sessionId,
      filePath,
      agentName: meta.agentName || null,
      title: cmeta?.userTitle ?? cmeta?.aiTitle ?? meta.title ?? null,
      firstPrompt: meta.firstPrompt || null,
      messageCount: Math.max(1, Math.round(stat.size / 500)),
      branch: meta.branch || null,
      startedAt: meta.startedAt || null,
      lastActiveAt,
      model: meta.model || null,
      contextPercent: meta.contextPercent ?? null,
      projectDirName: path.basename(dir),
      status: deriveStatus(lastActiveAt),
      pinned: Boolean(cmeta?.pinnedAt),
      archived: Boolean(cmeta?.archivedAt),
      pinnedAt: cmeta?.pinnedAt ?? null,
      color: cmeta?.color ?? null,
    });
  }

  // Pinned first (oldest pin first within the pinned group so order is stable),
  // then everything else by most-recent activity.
  return summaries.sort(compareSessionsForList);
}

// --- Conversation loading (on demand) ---

// Durable `/clear` boundary: a conversation cleared in-app records `cleared_at`
// (keyed by claudeSessionId = the .jsonl name). We then surface only messages
// strictly after that timestamp, so a reload shows the cleared conversation
// empty/fresh — the on-disk transcript is never modified. A message with no
// timestamp (synthetic tool-only row) is treated as pre-boundary and dropped.
function applyClearedBoundary(sessionId: string, messages: SessionMessage[]): SessionMessage[] {
  const clearedAt = getMeta(sessionId)?.clearedAt ?? null;
  if (!clearedAt) return messages;
  return messages.filter((m) => m.timestamp !== "" && m.timestamp > clearedAt);
}

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
      resolve({ sessionId, messages: applyClearedBoundary(sessionId, messages), totalTokensIn, totalTokensOut, model });
    });
    rl.on("error", (_err) => {
      resolve({ sessionId, messages: applyClearedBoundary(sessionId, messages), totalTokensIn, totalTokensOut, model });
    });
  });
}

// --- File watching (real-time activity detection) ---
// Implemented in `session.watch.ts`; re-exported here so existing importers
// (`sessions.ipc`) keep their `sessionService.startWatching` callsite.
export { startWatching, stopWatching } from "./session.watch";
