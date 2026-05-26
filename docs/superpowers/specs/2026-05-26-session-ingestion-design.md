# Session Ingestion — Design Spec

## Problem

The Agent Manager only sees activity from agents it spawns via `spawn.service.ts`. Claude Code's session files at `~/.claude/projects/<dir>/*.jsonl` contain all Claude Code activity — sessions from terminal, other tools, hooks — but the app ignores them.

## Claude Code JSONL Format

Location: `~/.claude/projects/<encoded-project-path>/` where directory name encodes the project path with `/` replaced by `-`.

Each `.jsonl` file is one session (`<sessionId>.jsonl`). Key entry types:

**Metadata (near top):**
- `ai-title` — `{ type, aiTitle: string }` — AI-generated session summary
- `agent-setting` — `{ type, agentSetting: string }` — which agent was used
- `last-prompt` — `{ type, lastPrompt: string, leafUuid, sessionId }`
- `permission-mode` — `{ type, permissionMode: string }`

**Messages:**
- `user` — `{ type, uuid, parentUuid, timestamp, cwd, gitBranch, message: { content: string|array }, promptId?, userType }` — user prompts have `promptId` and `userType: "external"`
- `assistant` — `{ type, uuid, message: { model, content: [{type:"text",text}|{type:"tool_use",...}], usage: { input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens } } }`

**Scale:** 264 sessions, 47K lines, 144MB for one project. One session can be 1500 lines / 5MB.

## Architecture

### Session Service (`electron/services/session.service.ts`)

Three responsibilities:

1. **Real-time file watching** — `fs.watch()` on project session directory. Track byte offsets per file. On change, tail-read new content, parse lines, broadcast activity events.

2. **Session listing (lazy)** — Read first ~50 lines of each JSONL to extract metadata (ai-title, agent-setting, first prompt, branch, timestamp). Return lightweight `SessionSummary[]`.

3. **Conversation loading (on demand)** — Read full file, filter for `user` and `assistant` entries only. Called when user clicks a session.

### Path Encoding

`/Users/michaeltouboul/tastewise` → `-Users-michaeltouboul-tastewise`

Function: `projectPath.replace(/\//g, '-')`

### Performance Strategy

- Watch one project directory at a time (the selected project)
- Metadata scan: first 50 lines only per file, early close
- Tail-read: byte offset tracking, read only new content
- In-memory cache: `Map<string, SessionSummary[]>` invalidated on file changes

### Cost Estimation

No `costUSD` in JSONL — compute from tokens + model:

```typescript
const MODEL_PRICING = {
  "claude-opus-4-7": { inputPer1M: 15, outputPer1M: 75 },
  "claude-sonnet-4-6": { inputPer1M: 3, outputPer1M: 15 },
  "claude-haiku-4-5": { inputPer1M: 0.80, outputPer1M: 4 },
};
```

## Types

```typescript
type SessionSummary = {
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

type SessionConversation = {
  sessionId: string;
  messages: SessionMessage[];
  totalTokensIn: number;
  totalTokensOut: number;
  model: string | null;
};

type SessionMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  uuid: string;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
};
```

## IPC API

| Channel | Args | Returns |
|---------|------|---------|
| `sessions:list` | `projectPath` | `SessionSummary[]` |
| `sessions:conversation` | `filePath` | `SessionConversation` |
| `sessions:watch-start` | `projectPath` | `void` |
| `sessions:watch-stop` | `projectPath` | `void` |

Real-time events via `broadcast()` → `push-event` channel:
- `{ type: "session_activity", sessionId, agentName, tokensIn?, tokensOut?, model? }`

## Renderer

- **Sessions accordion** in ProjectDashboard sidebar (between Agents and Skills)
- **SessionList** — rows with agent name, title, relative time, branch badge, message count
- **SessionViewer** — read-only conversation view in main content area
- **useIPC** handles `session_activity` events → feeds `markActive()` → AgentTree lights up

## Not in Scope (v1)

- No DB caching of session metadata
- No full-text search
- No editing/deleting sessions
- No watching all projects simultaneously
- No parsing attachments/file-history-snapshot/system entries
