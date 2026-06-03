import fs from "fs";
import path from "path";
import { broadcast } from "./broadcast";
import {
  createParseState,
  parseTranscriptLine,
  type TranscriptParseState,
} from "./session.transcript";
import type { SessionMessage } from "../types/session.types";

/**
 * Live-tail of a single OPEN conversation transcript by `filePath`. Keeps a
 * per-file cursor (byte offset + carried parse state) in a module-level Map;
 * on each filesystem change reads only the appended bytes, parses complete new
 * JSONL lines into the same `SessionMessage` shape `loadConversation` yields,
 * and broadcasts the DELTA (`conversation_appended`). Additive — the list
 * watcher (`session.watch`) and `loadConversation` are untouched. RAM-only.
 */

const DEBOUNCE_MS = 100;

interface TailEntry {
  watcher: fs.FSWatcher;
  /** Byte offset already consumed from the file. */
  offset: number;
  /** Incomplete trailing line carried until the next read completes it. */
  partial: string;
  /** Cross-line parse state (tool-only-turn accumulation). */
  parseState: TranscriptParseState;
  /** Debounce timer for the next flush. */
  timer: NodeJS.Timeout | null;
  /** Re-entrancy guard so overlapping fs events don't double-read. */
  flushing: boolean;
}

const tails = new Map<string, TailEntry>();

function safeSize(filePath: string): number {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

/**
 * Read `[offset, size)` from the file, split into lines, carry an incomplete
 * trailing line, parse complete lines into the delta, and advance the cursor.
 * Never throws.
 */
function flush(filePath: string): void {
  const entry = tails.get(filePath);
  if (!entry || entry.flushing) return;
  entry.flushing = true;

  try {
    const size = safeSize(filePath);

    // Truncated / rewritten (size shrank below the cursor) → reset and re-read.
    if (size < entry.offset) {
      entry.offset = 0;
      entry.partial = "";
      entry.parseState = createParseState();
    }

    if (size <= entry.offset) {
      entry.flushing = false;
      return;
    }

    let chunk = "";
    try {
      const fd = fs.openSync(filePath, "r");
      try {
        const length = size - entry.offset;
        const buf = Buffer.alloc(length);
        const read = fs.readSync(fd, buf, 0, length, entry.offset);
        chunk = buf.toString("utf-8", 0, read);
        entry.offset += read;
      } finally {
        fs.closeSync(fd);
      }
    } catch {
      entry.flushing = false;
      return;
    }

    const text = entry.partial + chunk;
    const lines = text.split("\n");
    entry.partial = lines.pop() ?? "";

    const messages: SessionMessage[] = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      const msg = parseTranscriptLine(line, entry.parseState);
      if (msg) messages.push(msg);
    }

    if (messages.length > 0) {
      broadcast({ type: "conversation_appended", filePath, messages });
    }
  } catch {
    // Never throw out of a watch callback.
  } finally {
    entry.flushing = false;
  }
}

function scheduleFlush(filePath: string): void {
  const entry = tails.get(filePath);
  if (!entry) return;
  if (entry.timer) clearTimeout(entry.timer);
  entry.timer = setTimeout(() => {
    const cur = tails.get(filePath);
    if (cur) cur.timer = null;
    flush(filePath);
  }, DEBOUNCE_MS);
}

/**
 * Begin tailing the conversation at `filePath`. The cursor starts at the
 * current file size (the caller seeds the existing messages via
 * `getSessionConversation`), so only genuinely-new appends are broadcast.
 * No-op if already watching or the file's parent dir is unavailable.
 */
export function watchConversation(filePath: string): void {
  if (tails.has(filePath)) return;

  const dir = path.dirname(filePath);
  const base = path.basename(filePath);

  let watcher: fs.FSWatcher;
  try {
    watcher = fs.watch(dir, (_event, filename) => {
      // fs.watch may report null filename on some platforms — flush anyway.
      if (filename && filename !== base) return;
      scheduleFlush(filePath);
    });
  } catch {
    return;
  }

  tails.set(filePath, {
    watcher,
    offset: safeSize(filePath),
    partial: "",
    parseState: createParseState(),
    timer: null,
    flushing: false,
  });
}

/** Stop tailing `filePath`: close the watcher, clear the timer, drop the cursor. */
export function unwatchConversation(filePath: string): void {
  const entry = tails.get(filePath);
  if (!entry) return;
  if (entry.timer) clearTimeout(entry.timer);
  try {
    entry.watcher.close();
  } catch {
    // ignore
  }
  tails.delete(filePath);
}
