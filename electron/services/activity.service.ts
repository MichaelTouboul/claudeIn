import fs from "fs";
import path from "path";
import { extractAssistantUsage, getProjectsBase } from "./session.transcript";
import type {
  ActivityByDay,
  ActivityByModel,
  ActivitySnapshot,
} from "../types/activity.types";

/**
 * Local-activity service: aggregates an honest, machine-local view of Claude
 * Code usage from the transcripts (`~/.claude/projects/*​/*.jsonl`). NOT plan
 * usage / limits — purely what this machine produced.
 *
 * Reuses `session.transcript`'s helpers — `getProjectsBase()` (HOME resolved
 * at call time) and `extractAssistantUsage()` (the assistant-line shape
 * parser), both shared with `session.service` — so JSON-line parsing is not
 * duplicated.
 *
 * Files are filtered by `mtime` within the window to bound the parse cost, and
 * the snapshot is cached in RAM for ~60s (mirrors `project.service`'s
 * `cachedProjects`/TTL). NEVER throws: a missing dir yields an empty snapshot;
 * a corrupt file/line is skipped.
 */

const DEFAULT_DAYS = 7;
const CACHE_TTL = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;

interface DayBucket {
  messages: number;
  tokens: number;
}

interface ModelBucket {
  tokens: number;
  messages: number;
}

interface Aggregate {
  byDay: Map<string, DayBucket>;
  byModel: Map<string, ModelBucket>;
  sessions: Set<string>;
}

/** YYYY-MM-DD in UTC for a Date. */
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** All `*.jsonl` transcript files across every project dir, with their paths. */
function listTranscriptFiles(base: string): string[] {
  if (!fs.existsSync(base)) return [];
  const files: string[] = [];
  let projectDirs: fs.Dirent[];
  try {
    projectDirs = fs.readdirSync(base, { withFileTypes: true });
  } catch {
    return [];
  }
  for (const dir of projectDirs) {
    if (!dir.isDirectory()) continue;
    const full = path.join(base, dir.name);
    let entries: string[];
    try {
      entries = fs.readdirSync(full);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.endsWith(".jsonl")) files.push(path.join(full, entry));
    }
  }
  return files;
}

/** Parse one transcript file into the aggregate. Never throws. */
function aggregateFile(filePath: string, sinceMs: number, agg: Aggregate): void {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf-8");
  } catch {
    return;
  }
  let hadActivity = false;
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let obj: Record<string, unknown>;
    try {
      obj = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue; // corrupt line → skip
    }
    const usage = extractAssistantUsage(obj);
    if (!usage) continue;

    const ts = typeof obj.timestamp === "string" ? Date.parse(obj.timestamp) : NaN;
    if (Number.isNaN(ts) || ts < sinceMs) continue;

    const tokens = usage.tokensIn + usage.tokensOut;
    const date = dayKey(new Date(ts));

    const day = agg.byDay.get(date) ?? { messages: 0, tokens: 0 };
    day.messages += 1;
    day.tokens += tokens;
    agg.byDay.set(date, day);

    const modelKey = usage.model ?? "unknown";
    const model = agg.byModel.get(modelKey) ?? { tokens: 0, messages: 0 };
    model.tokens += tokens;
    model.messages += 1;
    agg.byModel.set(modelKey, model);

    hadActivity = true;
  }
  if (hadActivity) agg.sessions.add(filePath);
}

/** Build the contiguous day list (ascending) covering the window. */
function buildByDay(byDay: Map<string, DayBucket>, days: number, now: number): ActivityByDay[] {
  const result: ActivityByDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = dayKey(new Date(now - i * DAY_MS));
    const bucket = byDay.get(date) ?? { messages: 0, tokens: 0 };
    result.push({ date, messages: bucket.messages, tokens: bucket.tokens });
  }
  return result;
}

function computeActivity(days: number): ActivitySnapshot {
  const now = Date.now();
  const sinceMs = now - days * DAY_MS;
  const todayKey = dayKey(new Date(now));

  const agg: Aggregate = { byDay: new Map(), byModel: new Map(), sessions: new Set() };
  for (const file of listTranscriptFiles(getProjectsBase())) {
    let mtimeMs: number;
    try {
      mtimeMs = fs.statSync(file).mtimeMs;
    } catch {
      continue;
    }
    if (mtimeMs < sinceMs) continue; // mtime window filter — bound the parse cost
    aggregateFile(file, sinceMs, agg);
  }

  const byModel: ActivityByModel[] = [...agg.byModel.entries()]
    .map(([model, b]) => ({ model, tokens: b.tokens, messages: b.messages }))
    .sort((a, b) => b.tokens - a.tokens);

  const byDay = buildByDay(agg.byDay, days, now);
  const todayBucket = agg.byDay.get(todayKey) ?? { messages: 0, tokens: 0 };

  return {
    today: {
      messages: todayBucket.messages,
      tokens: todayBucket.tokens,
      sessions: agg.sessions.size,
    },
    byModel,
    byDay,
  };
}

let cached: { days: number; snapshot: ActivitySnapshot } | null = null;
let lastComputed = 0;

/**
 * Local-activity snapshot over the last `days` (default 7). Cached in RAM for
 * ~60s per window size. Never throws.
 */
export function getActivity(days: number = DEFAULT_DAYS): ActivitySnapshot {
  const window = days > 0 ? days : DEFAULT_DAYS;
  if (cached && cached.days === window && Date.now() - lastComputed < CACHE_TTL) {
    return cached.snapshot;
  }
  const snapshot = computeActivity(window);
  cached = { days: window, snapshot };
  lastComputed = Date.now();
  return snapshot;
}

/** Clear the in-RAM cache (used by tests). */
export function __resetActivityCache(): void {
  cached = null;
  lastComputed = 0;
}
