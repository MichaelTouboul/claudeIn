# Session Ingestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ingest Claude Code's JSONL session files to detect real-time activity, show session history, and provide usage analytics — making the app see ALL Claude Code activity, not just spawned sessions.

**Architecture:** A new `session.service.ts` in the Electron main process watches `~/.claude/projects/<dir>/` for JSONL changes, parses session metadata lazily, and loads conversations on demand. Data flows to the renderer via IPC (invoke for queries, broadcast for real-time events). The renderer gets a Sessions panel in the sidebar, a conversation viewer, and `useIPC` handles activity events to light up the AgentTree.

**Tech Stack:** Same as existing — Electron, TypeScript, React, Tailwind. No new dependencies (`fs.watch` is built-in).

---

## File Map

### Files to create

| File | Responsibility |
|------|---------------|
| `electron/types/session.types.ts` | SessionSummary, SessionConversation, SessionMessage types |
| `electron/services/session.service.ts` | JSONL parsing, file watching, listing, conversation loading |
| `electron/ipc/sessions.ipc.ts` | IPC handlers for session operations |
| `src/hooks/useSessions.ts` | React hook for session list and conversation state |
| `src/components/SessionList.tsx` | Session history sidebar panel |
| `src/components/SessionViewer.tsx` | Read-only conversation viewer |

### Files to modify

| File | Changes |
|------|---------|
| `electron/ipc/index.ts` | Register session handlers |
| `electron/preload.ts` | Expose 4 session API methods |
| `src/env.d.ts` | Add session API type declarations |
| `src/hooks/useIPC.ts` | Handle `session_activity` events |
| `src/components/ProjectDashboard.tsx` | Add Sessions accordion + session viewer |
| `src/App.tsx` | Start/stop session watcher on project change |

---

## Phase 1: Session Service Foundation

### Task 1: Create session types

**Files:**
- Create: `electron/types/session.types.ts`

- [ ] **Step 1: Create the types file**

```typescript
export type SessionSummary = {
  sessionId: string;
  filePath: string;
  agentName: string | null;
  title: string | null;
  firstPrompt: string | null;
  messageCount: number;
  branch: string | null;
  startedAt: string | null;
  lastActiveAt: string | null;
  model: string | null;
  projectDirName: string;
};

export type SessionConversation = {
  sessionId: string;
  messages: SessionMessage[];
  totalTokensIn: number;
  totalTokensOut: number;
  model: string | null;
};

export type SessionMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  uuid: string;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  toolNames?: string[];
};
```

- [ ] **Step 2: Commit**

```bash
git add electron/types/session.types.ts
git commit -m "feat: add session ingestion types"
```

### Task 2: Create session.service.ts

**Files:**
- Create: `electron/services/session.service.ts`

This is the largest and most complex new file. It has four sections: path encoding, metadata listing, conversation loading, and file watching.

- [ ] **Step 1: Create the service**

```typescript
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
    const stat = fs.statSync(filePath);
    const lineCount = estimateLineCount(stat.size);

    const meta = await extractMetadata(filePath);

    summaries.push({
      sessionId,
      filePath,
      agentName: meta.agentName || null,
      title: meta.title || null,
      firstPrompt: meta.firstPrompt || null,
      messageCount: lineCount,
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

function estimateLineCount(fileSize: number): number {
  return Math.max(1, Math.round(fileSize / 500));
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

export function startWatching(projectPath: string): void {
  const dir = getSessionsDir(projectPath);
  if (!fs.existsSync(dir)) return;
  if (watchers.has(dir)) return;

  // Initialize offsets for existing files
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
  for (const f of files) {
    const fp = path.join(dir, f);
    const stat = fs.statSync(fp);
    fileOffsets.set(fp, stat.size);
  }

  const watcher = fs.watch(dir, (eventType, filename) => {
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
              const obj = JSON.parse(line);
              processNewLine(obj);
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

function processNewLine(obj: Record<string, unknown>): void {
  const agentName = (obj as any).agentName || (obj as any).agentSetting || null;
  const sessionId = (obj as any).sessionId || null;

  if (obj.type === "assistant" && (obj as any).message) {
    const msg = (obj as any).message;
    const usage = msg.usage;
    broadcast({
      type: "session_activity",
      sessionId,
      agentName: agentName || "unknown",
      tokensIn: usage?.input_tokens || 0,
      tokensOut: usage?.output_tokens || 0,
      model: msg.model || undefined,
    });
  }

  if (obj.type === "user" && (obj as any).promptId) {
    broadcast({
      type: "session_activity",
      sessionId,
      agentName: agentName || "unknown",
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

  // Clean up offsets for this directory
  for (const key of fileOffsets.keys()) {
    if (key.startsWith(dir)) fileOffsets.delete(key);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add electron/services/session.service.ts
git commit -m "feat: add session service with JSONL parsing, listing, and file watching"
```

### Task 3: Create sessions IPC handlers

**Files:**
- Create: `electron/ipc/sessions.ipc.ts`

- [ ] **Step 1: Create the IPC handlers**

```typescript
import { ipcMain } from "electron";
import * as sessionService from "../services/session.service";

export function registerSessionHandlers(): void {
  ipcMain.handle("sessions:list", (_e, projectPath: string) =>
    sessionService.listSessions(projectPath));

  ipcMain.handle("sessions:conversation", (_e, filePath: string) =>
    sessionService.loadConversation(filePath));

  ipcMain.handle("sessions:watch-start", (_e, projectPath: string) =>
    sessionService.startWatching(projectPath));

  ipcMain.handle("sessions:watch-stop", (_e, projectPath: string) =>
    sessionService.stopWatching(projectPath));
}
```

- [ ] **Step 2: Commit**

```bash
git add electron/ipc/sessions.ipc.ts
git commit -m "feat: add session IPC handlers"
```

### Task 4: Register handlers, update preload and env.d.ts

**Files:**
- Modify: `electron/ipc/index.ts`
- Modify: `electron/preload.ts`
- Modify: `src/env.d.ts`

- [ ] **Step 1: Register in index.ts**

Add to `electron/ipc/index.ts`:

```typescript
import { registerSessionHandlers } from "./sessions.ipc";
```

Add `registerSessionHandlers();` inside `registerAllHandlers()`.

- [ ] **Step 2: Add to preload.ts**

Add these 4 methods to the `contextBridge.exposeInMainWorld("api", {...})` object in `electron/preload.ts`:

```typescript
  getSessionList: (projectPath: string) => ipcRenderer.invoke("sessions:list", projectPath),
  getSessionConversation: (filePath: string) => ipcRenderer.invoke("sessions:conversation", filePath),
  watchSessions: (projectPath: string) => ipcRenderer.invoke("sessions:watch-start", projectPath),
  unwatchSessions: (projectPath: string) => ipcRenderer.invoke("sessions:watch-stop", projectPath),
```

- [ ] **Step 3: Add to env.d.ts**

Add to the `Window.api` interface in `src/env.d.ts`:

```typescript
    getSessionList: (projectPath: string) => Promise<unknown[]>;
    getSessionConversation: (filePath: string) => Promise<unknown>;
    watchSessions: (projectPath: string) => Promise<void>;
    unwatchSessions: (projectPath: string) => Promise<void>;
```

- [ ] **Step 4: Commit**

```bash
git add electron/ipc/index.ts electron/preload.ts src/env.d.ts
git commit -m "feat: register session handlers in preload and IPC index"
```

---

## Phase 2: Real-Time Activity Detection

### Task 5: Handle session_activity events in useIPC

**Files:**
- Modify: `src/hooks/useIPC.ts`

- [ ] **Step 1: Add session_activity handling**

In the `useEffect` `onEvent` handler, add after the existing `spawn_usage` block:

```typescript
      if (data.type === "session_activity") {
        markActive(
          data.agentName || "unknown",
          data.tokensIn || 0,
          data.tokensOut || 0,
          0,
          undefined
        );
      }
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useIPC.ts
git commit -m "feat: handle session_activity events for real-time agent detection"
```

### Task 6: Start/stop session watcher on project change

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add watcher lifecycle**

Add a `useEffect` in `App` that watches for project changes:

```typescript
  useEffect(() => {
    if (selectedProject) {
      window.api.watchSessions(selectedProject.path);
    }
    return () => {
      if (selectedProject) {
        window.api.unwatchSessions(selectedProject.path);
      }
    };
  }, [selectedProject]);
```

Add `useEffect` to the React import.

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: start/stop session file watcher on project selection"
```

---

## Phase 3: Session History UI

### Task 7: Create useSessions hook

**Files:**
- Create: `src/hooks/useSessions.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useState, useEffect, useCallback } from "react";

export type SessionSummary = {
  sessionId: string;
  filePath: string;
  agentName: string | null;
  title: string | null;
  firstPrompt: string | null;
  messageCount: number;
  branch: string | null;
  startedAt: string | null;
  lastActiveAt: string | null;
  model: string | null;
};

export type SessionConversation = {
  sessionId: string;
  messages: SessionMessage[];
  totalTokensIn: number;
  totalTokensOut: number;
  model: string | null;
};

export type SessionMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  uuid: string;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  toolNames?: string[];
};

export function useSessions(projectPath: string | null) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState<SessionConversation | null>(null);
  const [conversationLoading, setConversationLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!projectPath) return;
    setLoading(true);
    const data = await window.api.getSessionList(projectPath);
    setSessions(data as SessionSummary[]);
    setLoading(false);
  }, [projectPath]);

  useEffect(() => { refresh(); }, [refresh]);

  const selectSession = useCallback(async (filePath: string) => {
    setConversationLoading(true);
    const data = await window.api.getSessionConversation(filePath);
    setConversation(data as SessionConversation);
    setConversationLoading(false);
  }, []);

  const clearConversation = useCallback(() => {
    setConversation(null);
  }, []);

  return { sessions, loading, conversation, conversationLoading, selectSession, clearConversation, refresh };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useSessions.ts
git commit -m "feat: add useSessions hook"
```

### Task 8: Create SessionList component

**Files:**
- Create: `src/components/SessionList.tsx`

- [ ] **Step 1: Create SessionList**

A compact sidebar list. Each row shows agent name, title or first prompt, relative time, and branch badge.

```tsx
import { Clock, GitBranch, Bot, MessageSquare } from "lucide-react";
import type { SessionSummary } from "../hooks/useSessions";

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function SessionList({
  sessions,
  selectedId,
  onSelect,
}: {
  sessions: SessionSummary[];
  selectedId: string | null;
  onSelect: (session: SessionSummary) => void;
}) {
  return (
    <div className="space-y-0.5">
      {sessions.map((s) => (
        <button
          key={s.sessionId}
          onClick={() => onSelect(s)}
          className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
            selectedId === s.sessionId
              ? "bg-gray-700/80 ring-1 ring-cyan-500/25"
              : "hover:bg-gray-800/40"
          }`}
        >
          <div className="flex items-center gap-2">
            <Bot size={11} className="text-gray-500 shrink-0" />
            <span className="text-xs font-medium text-gray-300 truncate">
              {s.agentName || "no agent"}
            </span>
            <span className="ml-auto text-[10px] text-gray-600 flex items-center gap-1">
              <Clock size={9} />
              {timeAgo(s.lastActiveAt)}
            </span>
          </div>
          <div className="mt-0.5 text-[11px] text-gray-500 truncate pl-5">
            {s.title || s.firstPrompt || s.sessionId.slice(0, 8)}
          </div>
          {s.branch && (
            <div className="flex items-center gap-1 mt-0.5 pl-5">
              <GitBranch size={9} className="text-gray-600" />
              <span className="text-[10px] text-gray-600 truncate">{s.branch}</span>
            </div>
          )}
        </button>
      ))}
      {sessions.length === 0 && (
        <p className="text-xs text-gray-600 text-center py-4">No sessions found</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SessionList.tsx
git commit -m "feat: add SessionList sidebar component"
```

### Task 9: Create SessionViewer component

**Files:**
- Create: `src/components/SessionViewer.tsx`

- [ ] **Step 1: Create SessionViewer**

Read-only conversation viewer. Reuses the visual patterns from AgentChat (cyan for user, gray for assistant, yellow for tools).

```tsx
import { Bot, ChevronRight, Wrench, ArrowUp, ArrowDown } from "lucide-react";
import { useRef } from "react";
import type { SessionConversation } from "../hooks/useSessions";

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export default function SessionViewer({
  conversation,
  loading,
}: {
  conversation: SessionConversation | null;
  loading: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
        Loading conversation...
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center text-gray-600 text-sm">
        Select a session to view
      </div>
    );
  }

  const scrollTo = (pos: "top" | "bottom") => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = pos === "top" ? 0 : scrollRef.current.scrollHeight;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-3 border-b border-gray-800 flex items-center gap-3">
        <Bot size={14} className="text-cyan-400" />
        <span className="text-sm font-medium text-white">
          Session {conversation.sessionId.slice(0, 8)}
        </span>
        {conversation.model && (
          <span className="text-[10px] bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded">
            {conversation.model}
          </span>
        )}
        <span className="text-[10px] text-gray-500 font-mono tabular-nums ml-auto">
          {formatTokens(conversation.totalTokensIn)} in · {formatTokens(conversation.totalTokensOut)} out · {conversation.messages.length} msgs
        </span>
        <div className="flex items-center gap-0.5 ml-2">
          <button onClick={() => scrollTo("top")} className="p-1 text-gray-600 hover:text-gray-300"><ArrowUp size={12} /></button>
          <button onClick={() => scrollTo("bottom")} className="p-1 text-gray-600 hover:text-gray-300"><ArrowDown size={12} /></button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4 font-mono">
        {conversation.messages.map((msg, i) => (
          <div key={i} className="group">
            {msg.role === "user" ? (
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <ChevronRight size={12} className="text-cyan-400" />
                  <span className="text-xs text-cyan-400 font-medium">you</span>
                </div>
                <pre className="text-sm text-cyan-300 whitespace-pre-wrap ml-5 leading-relaxed">{msg.content}</pre>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Bot size={12} className="text-gray-400" />
                  <span className="text-xs text-gray-400 font-medium">assistant</span>
                  {msg.tokensIn != null && msg.tokensIn > 0 && (
                    <span className="text-[10px] text-gray-600 ml-auto tabular-nums">
                      {formatTokens(msg.tokensIn)}↓ {formatTokens(msg.tokensOut || 0)}↑
                    </span>
                  )}
                </div>
                {msg.toolNames && msg.toolNames.length > 0 && (
                  <div className="flex flex-wrap gap-1 ml-5 mb-1">
                    {msg.toolNames.map((t, j) => (
                      <span key={j} className="flex items-center gap-1 text-[10px] text-yellow-500/70">
                        <Wrench size={9} />{t}
                      </span>
                    ))}
                  </div>
                )}
                <pre className="text-sm text-gray-200 whitespace-pre-wrap ml-5 leading-relaxed">{msg.content}</pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SessionViewer.tsx
git commit -m "feat: add SessionViewer read-only conversation component"
```

### Task 10: Integrate sessions into ProjectDashboard

**Files:**
- Modify: `src/components/ProjectDashboard.tsx`

- [ ] **Step 1: Add imports and state**

Add imports:
```typescript
import SessionList from "./SessionList";
import SessionViewer from "./SessionViewer";
import { useSessions, type SessionSummary } from "../hooks/useSessions";
import { History } from "lucide-react";
```

Add `"session"` to the `MainView` type:
```typescript
type MainView = "agent" | "skill" | "hook" | "tree" | "costs" | "session" | "none";
```

Inside `ProjectDashboard`, add the hook and state:
```typescript
const { sessions, loading: sessionsLoading, conversation, conversationLoading, selectSession, clearConversation } = useSessions(project.path);
const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
```

- [ ] **Step 2: Add Sessions accordion to sidebar**

Add a new accordion entry in the sidebar panels array, after the agents entry:

```tsx
{
  key: "sessions",
  label: "Sessions",
  icon: <History size={11} className="text-purple-400" />,
  count: sessions.length,
  content: sessionsLoading ? (
    <p className="text-xs text-gray-600 text-center py-4">Loading sessions...</p>
  ) : (
    <SessionList
      sessions={sessions}
      selectedId={selectedSessionId}
      onSelect={(s) => {
        setSelectedSessionId(s.sessionId);
        selectSession(s.filePath);
        setView("session");
      }}
    />
  ),
},
```

- [ ] **Step 3: Add session viewer to main content**

Add a render branch in the main content area:

```tsx
) : view === "session" ? (
  <SessionViewer conversation={conversation} loading={conversationLoading} />
```

- [ ] **Step 4: Add Sessions button to top bar**

Add between Tree and Costs buttons:

```tsx
<button
  onClick={() => setView("session")}
  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
    view === "session" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
  }`}
>
  <History size={13} />
  Sessions
</button>
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ProjectDashboard.tsx
git commit -m "feat: integrate sessions panel and viewer into ProjectDashboard"
```
