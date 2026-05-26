# Agent Manager v2 — Scope Clarity, Activity Tree, Memory Manager & Chat UX

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the agent manager from a flat agent browser into a useful dashboard with clear scope separation, real-time activity tree, memory management, and multi-scope chat.

**Architecture:** Seven phases, each producing working software. Phase 1 cleans dead code. Phase 2 refactors the sidebar for scope clarity. Phase 3 replaces the two graph components with a single activity tree. Phase 4 improves token tracking in the stream parser. Phase 5 builds a full memory manager. Phase 6 adds project memory API. Phase 7 overhauls chat UX with modal and scoped conversations.

**Tech Stack:** React 18, TypeScript, Tailwind CSS 3, Express, PostgreSQL, zustand, lucide-react. No new dependencies added.

**Testing:** No test framework exists. Verification is visual via dev server (`npm start`). Each phase ends with a commit and visual check.

---

## File Map

### Files to create
| File | Responsibility |
|------|---------------|
| `client/src/components/AgentTree.tsx` | Tree view of orchestrator → sub-agent relationships with real-time activity indicators |
| `client/src/components/MemoryManager.tsx` | Full memory management UI: index, size gauges, freshness, edit, create |
| `client/src/components/GlobalChatModal.tsx` | Modal-based global chat (no project scope), minimizable, shows conversation title |
| `server/src/services/memory.service.ts` | Read/write project memory from `~/.claude/projects/<project>/memory/` |
| `server/src/routes/memory.ts` | REST endpoints for project memory CRUD |

### Files to modify
| File | Changes |
|------|---------|
| `client/src/components/ProjectDashboard.tsx` | Replace Mesh tab with Tree tab; refactor sidebar scope sections with visual tabs; wire up project chat |
| `client/src/hooks/useSSE.ts` | Add `currentTool` tracking; model-aware context limits; compaction reset |
| `server/src/services/spawn.service.ts` | Parse `usage` fields and `model` from stream-json events |
| `server/src/types/spawn.types.ts` | Add `usage` to `StreamEvent` type |
| `client/src/types/agent.types.ts` | Add `scope` and `linked` to `AgentFile` |
| `client/src/services/api.ts` | Add project memory API methods |
| `client/src/components/MemoryViewer.tsx` | Will be replaced by MemoryManager — delete contents, re-export from MemoryManager |
| `client/src/App.tsx` | Replace side-panel chat with GlobalChatModal |
| `server/src/index.ts` | Register memory routes |

### Files to delete
| File | Reason |
|------|--------|
| `client/src/components/AgentGraph.tsx` | Replaced by AgentTree |
| `client/src/components/AgentMesh.tsx` | Replaced by AgentTree |

---

## Phase 1: Foundation Cleanup

### Task 1: Remove dead graph components and dependencies

**Files:**
- Delete: `client/src/components/AgentGraph.tsx`
- Delete: `client/src/components/AgentMesh.tsx`
- Modify: `client/src/components/ProjectDashboard.tsx:1-17` (remove imports)
- Modify: `client/src/components/ProjectDashboard.tsx:717-731` (remove Mesh tab button and view)

- [ ] **Step 1: Remove AgentGraph.tsx and AgentMesh.tsx**

```bash
rm client/src/components/AgentGraph.tsx client/src/components/AgentMesh.tsx
```

- [ ] **Step 2: Remove imports and references from ProjectDashboard.tsx**

In `client/src/components/ProjectDashboard.tsx`, remove the import lines:

```typescript
// REMOVE these two imports:
import AgentMesh from "./AgentMesh";
// (AgentGraph is not imported in ProjectDashboard — it was only used in AgentDetail's "graph" tab)
```

Remove the Mesh tab button (around line 720):

```tsx
// REMOVE this button:
<button
  onClick={() => setView("mesh")}
  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
    view === "mesh" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
  }`}
>
  <Hexagon size={13} />
  Mesh
</button>
```

Remove the Mesh view render (around line 739):

```tsx
// REMOVE this branch:
) : view === "mesh" ? (
  <AgentMesh agents={agents} activeAgents={activeAgents} onSelect={handleSelectAgent} />
```

Update the `MainView` type to remove `"mesh"`:

```typescript
type MainView = "agent" | "skill" | "hook" | "tree" | "costs" | "none";
```

Remove `Hexagon` from the lucide-react import and `Network` (if not used elsewhere after removing OrchestratorTree icon).

- [ ] **Step 3: Remove graph tab from AgentDetail**

In `client/src/components/AgentDetail.tsx`, remove the `"graph"` entry from the `TABS` array:

```typescript
const TABS = ["overview", "chat", "prompt", "memory", "files"] as const;
```

Remove the `graph` entry from `tabIcons`:

```typescript
const tabIcons: Record<Tab, React.ReactNode> = {
  overview: <Settings size={14} />,
  chat: <Terminal size={14} />,
  prompt: <FileText size={14} />,
  memory: <Brain size={14} />,
  files: <Database size={14} />,
};
```

Remove the graph tab content render:

```tsx
// REMOVE:
{tab === "graph" && (
  <p className="text-gray-500 text-sm">
    Graph view — select from the top-level Graph tab to see all agents.
  </p>
)}
```

Remove the `GitBranch` import from lucide-react.

- [ ] **Step 4: Uninstall graph libraries**

```bash
cd client && npm uninstall @xyflow/react react-force-graph-2d
```

- [ ] **Step 5: Verify and commit**

```bash
npm run dev
# Check browser: dashboard loads, no console errors, Costs tab still works
# Agent detail has 5 tabs: Overview, Chat, Prompt, Memory, Files
```

```bash
git add -A && git commit -m "chore: remove unused graph components and dependencies"
```

---

## Phase 2: Scope-Aware Sidebar

### Task 2: Add scope and linked fields to client AgentFile type

**Files:**
- Modify: `client/src/types/agent.types.ts`

- [ ] **Step 1: Add scope and linked to AgentFile**

In `client/src/types/agent.types.ts`, add to the `AgentFile` type:

```typescript
export type AgentFile = {
  id: string;
  filePath: string;
  relativePath: string;
  folder: string;
  frontmatter: AgentFrontmatter;
  body: string;
  status: "created" | "to_create";
  subAgents: string[];
  memoryFiles: MemoryFile[];
  annexFiles: AnnexFile[];
  scope?: "user" | "project";
  linked?: boolean;
};
```

- [ ] **Step 2: Commit**

```bash
git add client/src/types/agent.types.ts && git commit -m "feat: add scope and linked fields to AgentFile type"
```

### Task 3: Refactor sidebar with scope tabs

**Files:**
- Modify: `client/src/components/ProjectDashboard.tsx:483-710`

This replaces the current sidebar agent section where user agents are shown at 60% opacity with a proper tabbed interface.

- [ ] **Step 1: Replace the agent section in the sidebar**

In `client/src/components/ProjectDashboard.tsx`, add a `scopeTab` state at the top of `ProjectDashboard`:

```typescript
const [scopeTab, setScopeTab] = useState<"project" | "user">("project");
```

- [ ] **Step 2: Replace the agents accordion content**

Replace the agents accordion content (currently around lines 618-640) with a tabbed view. Replace the entire agents accordion content block with:

```tsx
{
  key: "agents",
  label: "Agents",
  icon: <Bot size={11} className="text-cyan-400" />,
  count: agents.length,
  content: isUserProject ? (
    renderAgentList(agents, agents, selectedAgent?.id ?? null, handleSelectAgent, handleAgentAction, undefined, undefined, (n) => isFavorite("agent", n), activeAgents, agentContexts)
  ) : (
    <div>
      {/* Scope tabs */}
      <div className="flex items-center gap-0.5 px-2 mb-2">
        <button
          onClick={() => setScopeTab("project")}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
            scopeTab === "project"
              ? "bg-cyan-500/15 text-cyan-400"
              : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
          }`}
        >
          <Globe size={10} />
          Project
          <span className="text-[10px] opacity-60">{projectAgents.length}</span>
        </button>
        <button
          onClick={() => setScopeTab("user")}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
            scopeTab === "user"
              ? "bg-yellow-500/15 text-yellow-400"
              : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
          }`}
        >
          <User size={10} />
          User
          <span className="text-[10px] opacity-60">{userAgents.length}</span>
        </button>
      </div>
      {/* Scope content */}
      {scopeTab === "project" ? (
        projectAgents.length > 0 ? (
          renderAgentList(projectAgents, agents, selectedAgent?.id ?? null, handleSelectAgent, handleAgentAction, (name) => handleToggleLink(name, true), "unlink", (n) => isFavorite("agent", n), activeAgents, agentContexts)
        ) : (
          <div className="px-3 py-4 text-center">
            <p className="text-xs text-gray-500 mb-2">No project agents</p>
            <p className="text-[10px] text-gray-600">Link user agents or create agents in <code className="text-cyan-500">.claude/agents/</code></p>
          </div>
        )
      ) : (
        userAgents.length > 0 ? (
          renderAgentList(userAgents, agents, selectedAgent?.id ?? null, handleSelectAgent, handleAgentAction, (name) => handleToggleLink(name, false), "link", (n) => isFavorite("agent", n), activeAgents, agentContexts)
        ) : (
          <p className="px-3 py-4 text-xs text-gray-500 text-center">No user agents</p>
        )
      )}
    </div>
  ),
},
```

- [ ] **Step 3: Verify and commit**

```bash
npm run dev
# Check: sidebar shows "Project | User" tabs when a project is selected
# Clicking each tab filters agents
# User Scope project still shows flat list (no tabs)
# Link/Unlink icons still work
```

```bash
git add client/src/components/ProjectDashboard.tsx && git commit -m "feat: scope-aware sidebar with Project/User tabs"
```

---

## Phase 3: Activity Tree

### Task 4: Build AgentTree component

**Files:**
- Create: `client/src/components/AgentTree.tsx`

- [ ] **Step 1: Create AgentTree.tsx**

```tsx
import { useMemo } from "react";
import { ChevronRight, ChevronDown, Cog, Network, Wrench } from "lucide-react";
import { useState } from "react";
import type { AgentFile } from "../types/agent.types";
import type { AgentContext } from "../hooks/useSSE";

const colorValues: Record<string, string> = {
  cyan: "#06b6d4", blue: "#3b82f6", green: "#22c55e",
  yellow: "#eab308", orange: "#f97316", red: "#ef4444",
  purple: "#a855f7", pink: "#ec4899",
};

function ContextGauge({ context }: { context: AgentContext }) {
  const barColor =
    context.percent >= 90 ? "bg-red-500" :
    context.percent >= 70 ? "bg-yellow-500" :
    "bg-cyan-500";

  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${context.percent}%` }}
        />
      </div>
      <span className="text-[10px] text-gray-500 font-mono w-8 text-right">
        {context.percent.toFixed(0)}%
      </span>
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function TreeNode({
  agent,
  depth,
  isActive,
  context,
  currentTool,
  selected,
  onSelect,
}: {
  agent: AgentFile;
  depth: number;
  isActive: boolean;
  context?: AgentContext;
  currentTool?: string;
  selected: boolean;
  onSelect: (a: AgentFile) => void;
}) {
  const color = colorValues[agent.frontmatter.color || ""] || "#6b7280";
  const model = agent.frontmatter.model || "inherit";
  const isOrchestrator = agent.subAgents.length > 0;

  return (
    <button
      onClick={() => onSelect(agent)}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
        selected ? "bg-gray-700/80 ring-1 ring-cyan-500/30" : "hover:bg-gray-800/60"
      }`}
      style={{ paddingLeft: `${12 + depth * 20}px` }}
    >
      <div className="flex items-center gap-2">
        {isOrchestrator ? (
          <Network size={13} className={isActive ? "text-green-400" : "text-cyan-400"} />
        ) : (
          <Cog size={11} className={isActive ? "text-green-400" : "text-gray-500"} />
        )}

        <span
          className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "animate-pulse" : ""}`}
          style={{ backgroundColor: isActive ? "#4ade80" : color }}
        />

        <span className={`text-sm font-medium truncate ${isActive ? "text-white" : "text-gray-300"}`}>
          {agent.id}
        </span>

        <span className="ml-auto text-[10px] text-gray-600 font-mono">{model}</span>
      </div>

      {isActive && context && context.percent > 0 && (
        <div className="ml-6 mt-1">
          <ContextGauge context={context} />
          <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-500">
            <span>In: {formatTokens(context.tokensIn)}</span>
            <span>Out: {formatTokens(context.tokensOut)}</span>
            <span className="text-yellow-500/70">${context.costUsd.toFixed(4)}</span>
          </div>
        </div>
      )}

      {isActive && currentTool && (
        <div className="flex items-center gap-1.5 ml-6 mt-1">
          <Wrench size={9} className="text-yellow-500" />
          <span className="text-[10px] text-yellow-500/80 font-mono truncate">{currentTool}</span>
        </div>
      )}
    </button>
  );
}

export default function AgentTree({
  agents,
  activeAgents,
  agentContexts,
  currentTools,
  selectedId,
  onSelect,
}: {
  agents: AgentFile[];
  activeAgents: Set<string>;
  agentContexts: Map<string, AgentContext>;
  currentTools?: Map<string, string>;
  selectedId: string | null;
  onSelect: (a: AgentFile) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const { orchestrators, standalones } = useMemo(() => {
    const agentIds = new Set(agents.map((a) => a.id));
    const subAgentIds = new Set<string>();
    for (const a of agents) {
      for (const sub of a.subAgents) {
        if (agentIds.has(sub)) subAgentIds.add(sub);
      }
    }
    return {
      orchestrators: agents.filter((a) => a.subAgents.length > 0),
      standalones: agents.filter((a) => a.subAgents.length === 0 && !subAgentIds.has(a.id)),
    };
  }, [agents]);

  const agentMap = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-950 p-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
        Agent Hierarchy
      </h3>

      <div className="space-y-0.5">
        {orchestrators.map((orch) => {
          const isCollapsed = collapsed.has(orch.id);
          const subs = orch.subAgents
            .map((id) => agentMap.get(id))
            .filter((a): a is AgentFile => !!a);

          return (
            <div key={orch.id}>
              <div className="flex items-center">
                <button
                  onClick={() => toggleCollapse(orch.id)}
                  className="p-1 text-gray-600 hover:text-gray-300"
                >
                  {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                </button>
                <div className="flex-1 min-w-0">
                  <TreeNode
                    agent={orch}
                    depth={0}
                    isActive={activeAgents.has(orch.id)}
                    context={agentContexts.get(orch.id)}
                    currentTool={currentTools?.get(orch.id)}
                    selected={selectedId === orch.id}
                    onSelect={onSelect}
                  />
                </div>
              </div>

              {!isCollapsed && subs.length > 0 && (
                <div className="ml-3 border-l border-gray-800">
                  {subs.map((sub) => (
                    <TreeNode
                      key={sub.id}
                      agent={sub}
                      depth={1}
                      isActive={activeAgents.has(sub.id)}
                      context={agentContexts.get(sub.id)}
                      currentTool={currentTools?.get(sub.id)}
                      selected={selectedId === sub.id}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {standalones.length > 0 && orchestrators.length > 0 && (
          <div className="border-t border-gray-800/50 my-2" />
        )}

        {standalones.map((a) => (
          <TreeNode
            key={a.id}
            agent={a}
            depth={0}
            isActive={activeAgents.has(a.id)}
            context={agentContexts.get(a.id)}
            currentTool={currentTools?.get(a.id)}
            selected={selectedId === a.id}
            onSelect={onSelect}
          />
        ))}
      </div>

      {agents.length === 0 && (
        <p className="text-sm text-gray-600 text-center py-8">No agents found</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/AgentTree.tsx && git commit -m "feat: add AgentTree component with real-time activity indicators"
```

### Task 5: Wire AgentTree into ProjectDashboard

**Files:**
- Modify: `client/src/components/ProjectDashboard.tsx`

- [ ] **Step 1: Add Tree tab replacing Mesh**

In `client/src/components/ProjectDashboard.tsx`, add the import:

```typescript
import AgentTree from "./AgentTree";
```

Replace the Mesh button in the top tab bar (around line 720) with a Tree button:

```tsx
<button
  onClick={() => setView("tree")}
  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
    view === "tree" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
  }`}
>
  <GitBranch size={13} />
  Tree
</button>
```

Add `GitBranch` to the lucide-react import (replace `Hexagon` if it was removed, otherwise add alongside).

Replace the mesh view render with tree:

```tsx
) : view === "tree" ? (
  <AgentTree
    agents={agents}
    activeAgents={activeAgents}
    agentContexts={agentContexts}
    selectedId={selectedAgent?.id ?? null}
    onSelect={handleSelectAgent}
  />
```

- [ ] **Step 2: Verify and commit**

```bash
npm run dev
# Check: "Tree" tab shows hierarchical view of agents
# Orchestrators are collapsible
# Active agents show context gauge (if SSE events are flowing)
# Clicking an agent opens its detail view
```

```bash
git add client/src/components/ProjectDashboard.tsx && git commit -m "feat: wire AgentTree into dashboard, replacing Mesh tab"
```

---

## Phase 4: Improved Token Tracking

### Task 6: Add usage fields to StreamEvent type

**Files:**
- Modify: `server/src/types/spawn.types.ts`

- [ ] **Step 1: Extend StreamEvent with usage**

```typescript
export type StreamEvent = {
  type: string;
  subtype?: string;
  session_id?: string;
  model?: string;
  message?: {
    role: string;
    content: Array<{ type: string; text?: string; name?: string; input?: unknown }>;
    usage?: { input_tokens?: number; output_tokens?: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number };
  };
  tool_use_id?: string;
  name?: string;
  input?: unknown;
  content?: Array<{ type: string; text?: string }>;
  result?: unknown;
  usage?: { input_tokens?: number; output_tokens?: number };
  [key: string]: unknown;
};
```

- [ ] **Step 2: Commit**

```bash
git add server/src/types/spawn.types.ts && git commit -m "feat: add usage and model fields to StreamEvent type"
```

### Task 7: Parse usage from stream events in spawn service

**Files:**
- Modify: `server/src/services/spawn.service.ts:150-206`

- [ ] **Step 1: Extract and broadcast usage data**

In `server/src/services/spawn.service.ts`, modify `handleStreamEvent` to capture usage data. Add after the existing `if (event.type === "result")` block:

```typescript
  const usage = event.usage || event.message?.usage;
  if (usage) {
    const tokensIn = usage.input_tokens || 0;
    const tokensOut = usage.output_tokens || 0;

    broadcast({
      type: "spawn_usage",
      sessionId,
      agentName: session.agentName,
      tokensIn,
      tokensOut,
      model: event.model || undefined,
    });

    ingestEvent({
      agent_name: session.agentName,
      session_id: sessionId,
      event_type: "Usage",
      tokens_in: tokensIn,
      tokens_out: tokensOut,
    }).catch(() => {});
  }
```

- [ ] **Step 2: Commit**

```bash
git add server/src/services/spawn.service.ts && git commit -m "feat: parse and broadcast usage data from stream events"
```

### Task 8: Track currentTool in useSSE

**Files:**
- Modify: `client/src/hooks/useSSE.ts`

- [ ] **Step 1: Add currentTools state and spawn_usage handling**

In `client/src/hooks/useSSE.ts`, add a `currentTools` state and handle the new `spawn_usage` event:

Add to the state declarations:

```typescript
const [currentTools, setCurrentTools] = useState<Map<string, string>>(new Map());
```

In the `markActive` callback, add a `toolName` parameter:

```typescript
const markActive = useCallback((agentName: string, tokensIn: number, tokensOut: number, costUsd: number, toolName?: string) => {
```

Inside `markActive`, after updating `agentContexts`, add:

```typescript
    if (toolName) {
      setCurrentTools((prev) => {
        const next = new Map(prev);
        next.set(agentName, toolName);
        return next;
      });
    }
```

In the timeout cleanup, clear the tool:

```typescript
    activeTimers.current.set(
      agentName,
      setTimeout(() => {
        setActiveAgents((prev) => {
          const next = new Set(prev);
          next.delete(agentName);
          return next;
        });
        setCurrentTools((prev) => {
          const next = new Map(prev);
          next.delete(agentName);
          return next;
        });
        activeTimers.current.delete(agentName);
      }, 5000)
    );
```

In the `onmessage` handler, handle `spawn_usage`:

```typescript
        if (data.type === "spawn_usage") {
          markActive(data.agentName, data.tokensIn || 0, data.tokensOut || 0, 0);
        }
```

Update the existing `markActive` call for regular events to pass `tool_name`:

```typescript
          markActive(event.agent_name, event.tokens_in || 0, event.tokens_out || 0, event.cost_usd || 0, event.tool_name || undefined);
```

Return `currentTools` from the hook:

```typescript
  return { events, connected, activeAgents, agentContexts, currentTools };
```

- [ ] **Step 2: Wire currentTools through App and ProjectDashboard**

In `client/src/App.tsx`, destructure `currentTools` from `useSSE()`:

```typescript
const { events, connected, activeAgents, agentContexts, currentTools } = useSSE();
```

Pass it to `ProjectDashboard`:

```tsx
<ProjectDashboard
  project={dashboard.project}
  agents={dashboard.agents}
  skills={dashboard.skills}
  hooks={dashboard.hooks}
  activeAgents={activeAgents}
  agentContexts={agentContexts}
  currentTools={currentTools}
  onRefresh={refresh}
/>
```

In `ProjectDashboard`, accept and forward `currentTools` to `AgentTree`:

```typescript
// Add to props type:
currentTools?: Map<string, string>;

// Pass to AgentTree:
<AgentTree
  agents={agents}
  activeAgents={activeAgents}
  agentContexts={agentContexts}
  currentTools={currentTools}
  selectedId={selectedAgent?.id ?? null}
  onSelect={handleSelectAgent}
/>
```

- [ ] **Step 3: Verify and commit**

```bash
npm run dev
# Start a chat session with an agent
# Check: Tree view shows current tool being used
# Check: Context gauge updates as tokens flow
```

```bash
git add client/src/hooks/useSSE.ts client/src/App.tsx client/src/components/ProjectDashboard.tsx && git commit -m "feat: track current tool and forward to AgentTree"
```

---

## Phase 5: Memory Manager

### Task 9: Build MemoryManager component

**Files:**
- Create: `client/src/components/MemoryManager.tsx`

- [ ] **Step 1: Create MemoryManager.tsx**

```tsx
import { useState } from "react";
import {
  Save, Trash2, X, FileText, Plus, AlertTriangle,
  Clock, ChevronDown, ChevronRight,
} from "lucide-react";
import type { AgentFile, MemoryFile } from "../types/agent.types";
import { api } from "../services/api";

const MAX_LINES = 200;
const MAX_BYTES = 25 * 1024;

function SizeGauge({ label, current, max, unit }: { label: string; current: number; max: number; unit: string }) {
  const percent = Math.min((current / max) * 100, 100);
  const color =
    percent >= 90 ? "bg-red-500" :
    percent >= 70 ? "bg-yellow-500" :
    "bg-cyan-500";
  const textColor =
    percent >= 90 ? "text-red-400" :
    percent >= 70 ? "text-yellow-400" :
    "text-gray-400";

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-12">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${percent}%` }} />
      </div>
      <span className={`text-[10px] font-mono ${textColor}`}>
        {current}/{max} {unit}
      </span>
    </div>
  );
}

function daysAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

function MemoryFileCard({
  file,
  agentName,
  isIndex,
  onRefresh,
}: {
  file: MemoryFile;
  agentName: string;
  isIndex: boolean;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(file.content);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(isIndex);

  const lines = file.content.split("\n").length;
  const bytes = new TextEncoder().encode(file.content).length;

  const save = async () => {
    setSaving(true);
    try {
      await api.updateMemoryFile(agentName, file.name, content);
      setEditing(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete ${file.name}?`)) return;
    await api.deleteMemoryFile(agentName, file.name);
    onRefresh();
  };

  return (
    <div className={`rounded-lg border ${isIndex ? "border-cyan-500/20 bg-cyan-500/5" : "border-gray-800 bg-gray-800/30"}`}>
      <div
        className="flex items-center gap-2 px-4 py-2.5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={12} className="text-gray-500" /> : <ChevronRight size={12} className="text-gray-500" />}
        <FileText size={13} className={isIndex ? "text-cyan-400" : "text-green-400"} />
        <span className={`text-sm font-medium ${isIndex ? "text-cyan-300" : "text-gray-300"}`}>{file.name}</span>
        {isIndex && <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">INDEX</span>}
        <span className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-gray-600 flex items-center gap-1">
            <Clock size={9} />
            {daysAgo(file.lastModified)}
          </span>
          <span className="text-[10px] text-gray-600">{lines}L</span>
        </span>
      </div>

      {expanded && (
        <div className="px-4 pb-3">
          {isIndex && (
            <div className="space-y-1.5 mb-3">
              <SizeGauge label="Lines" current={lines} max={MAX_LINES} unit="lines" />
              <SizeGauge label="Size" current={bytes} max={MAX_BYTES} unit="B" />
              {lines > MAX_LINES * 0.8 && (
                <div className="flex items-center gap-1.5 text-[10px] text-yellow-400">
                  <AlertTriangle size={10} />
                  Approaching line limit — content past line {MAX_LINES} will be truncated at session start
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 mb-2">
            {editing ? (
              <>
                <button onClick={save} disabled={saving} className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1">
                  <Save size={11} />{saving ? "Saving..." : "Save"}
                </button>
                <button onClick={() => { setContent(file.content); setEditing(false); }} className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1">
                  <X size={11} />Cancel
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)} className="text-xs text-gray-500 hover:text-cyan-400">edit</button>
                {!isIndex && <button onClick={remove} className="text-xs text-gray-600 hover:text-red-400 flex items-center gap-1"><Trash2 size={10} /></button>}
              </>
            )}
          </div>

          {editing ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-56 bg-gray-900 text-gray-300 text-xs font-mono p-3 rounded-lg border border-gray-700 focus:border-cyan-500 focus:outline-none resize-y"
            />
          ) : (
            <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono max-h-56 overflow-y-auto bg-gray-900/50 rounded-lg p-3">
              {file.content || "(empty)"}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default function MemoryManager({
  agent,
  onRefresh,
}: {
  agent: AgentFile;
  onRefresh: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);

  if (!agent.frontmatter.memory) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 text-sm mb-2">No persistent memory configured.</p>
        <p className="text-xs text-gray-600">
          Add <code className="text-cyan-400">memory: project</code> or <code className="text-cyan-400">memory: user</code> to frontmatter to enable.
        </p>
      </div>
    );
  }

  const indexFile = agent.memoryFiles.find((f) => f.name === "MEMORY.md");
  const topicFiles = agent.memoryFiles.filter((f) => f.name !== "MEMORY.md").sort((a, b) => {
    return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
  });

  const handleCreate = async () => {
    if (!newFileName.trim()) return;
    const name = newFileName.endsWith(".md") ? newFileName : `${newFileName}.md`;
    setSaving(true);
    try {
      await api.updateMemoryFile(agent.id, name, newContent);
      setCreating(false);
      setNewFileName("");
      setNewContent("");
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>Scope:</span>
          <span className="px-2 py-0.5 bg-green-500/20 text-green-300 rounded-full text-xs font-medium">
            {agent.frontmatter.memory}
          </span>
          <span className="text-gray-600 text-xs font-mono">
            {agent.memoryFiles.length} files
          </span>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
        >
          <Plus size={12} />
          New topic
        </button>
      </div>

      {creating && (
        <div className="border border-cyan-500/30 rounded-lg p-4 bg-cyan-500/5">
          <div className="flex items-center gap-2 mb-2">
            <input
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="topic-name.md"
              className="flex-1 bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded px-3 py-1.5 focus:border-cyan-500 focus:outline-none font-mono"
              autoFocus
            />
            <button onClick={handleCreate} disabled={saving || !newFileName.trim()} className="px-3 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-white rounded disabled:opacity-50">
              {saving ? "Creating..." : "Create"}
            </button>
            <button onClick={() => setCreating(false)} className="p-1 text-gray-400 hover:text-white">
              <X size={14} />
            </button>
          </div>
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Initial content (optional)"
            rows={4}
            className="w-full bg-gray-900 border border-gray-700 text-gray-300 text-xs font-mono p-3 rounded-lg focus:border-cyan-500 focus:outline-none resize-y"
          />
        </div>
      )}

      {indexFile && (
        <MemoryFileCard file={indexFile} agentName={agent.id} isIndex onRefresh={onRefresh} />
      )}

      {topicFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Topic Files</h4>
          {topicFiles.map((f) => (
            <MemoryFileCard key={f.name} file={f} agentName={agent.id} isIndex={false} onRefresh={onRefresh} />
          ))}
        </div>
      )}

      {!indexFile && topicFiles.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-4">No memory files yet. They will be created during the agent's first session.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/MemoryManager.tsx && git commit -m "feat: add MemoryManager with size gauges, freshness, and topic management"
```

### Task 10: Replace MemoryViewer with MemoryManager in AgentDetail

**Files:**
- Modify: `client/src/components/AgentDetail.tsx:17-18,419`

- [ ] **Step 1: Swap imports and usage**

In `client/src/components/AgentDetail.tsx`, replace:

```typescript
import MemoryViewer from "./MemoryViewer";
```

with:

```typescript
import MemoryManager from "./MemoryManager";
```

Replace the memory tab content:

```tsx
{tab === "memory" && <MemoryManager agent={agent} onRefresh={onRefresh} />}
```

- [ ] **Step 2: Delete MemoryViewer.tsx**

```bash
rm client/src/components/MemoryViewer.tsx
```

- [ ] **Step 3: Verify and commit**

```bash
npm run dev
# Check: Memory tab shows MEMORY.md as INDEX with size gauges
# Topic files are collapsible
# "New topic" button creates a new memory file
# Edit/delete still work
```

```bash
git add client/src/components/AgentDetail.tsx && git rm client/src/components/MemoryViewer.tsx && git commit -m "feat: replace MemoryViewer with MemoryManager"
```

---

## Phase 6: Project Memory API

### Task 11: Create project memory service

**Files:**
- Create: `server/src/services/memory.service.ts`

- [ ] **Step 1: Create memory.service.ts**

```typescript
import fs from "fs/promises";
import path from "path";

const HOME = process.env.HOME!;
const PROJECTS_MEMORY_BASE = path.join(HOME, ".claude", "projects");

async function exists(p: string): Promise<boolean> {
  try { await fs.access(p); return true; } catch { return false; }
}

function resolveProjectMemoryDir(projectPath: string): string {
  const normalized = projectPath.replace(/\//g, "-").replace(/^-/, "");
  return path.join(PROJECTS_MEMORY_BASE, normalized, "memory");
}

export type ProjectMemoryFile = {
  name: string;
  path: string;
  content: string;
  lastModified: string;
  lines: number;
  bytes: number;
};

export async function getProjectMemory(projectPath: string): Promise<ProjectMemoryFile[]> {
  const memDir = resolveProjectMemoryDir(projectPath);
  if (!(await exists(memDir))) return [];

  const entries = await fs.readdir(memDir, { withFileTypes: true });
  const files: ProjectMemoryFile[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const full = path.join(memDir, entry.name);
    const content = await fs.readFile(full, "utf-8");
    const stat = await fs.stat(full);
    files.push({
      name: entry.name,
      path: full,
      content,
      lastModified: stat.mtime.toISOString(),
      lines: content.split("\n").length,
      bytes: Buffer.byteLength(content, "utf-8"),
    });
  }

  return files;
}

export async function updateProjectMemoryFile(
  projectPath: string,
  fileName: string,
  content: string
): Promise<ProjectMemoryFile> {
  const memDir = resolveProjectMemoryDir(projectPath);
  await fs.mkdir(memDir, { recursive: true });
  const full = path.join(memDir, fileName);
  await fs.writeFile(full, content, "utf-8");
  const stat = await fs.stat(full);
  return {
    name: fileName,
    path: full,
    content,
    lastModified: stat.mtime.toISOString(),
    lines: content.split("\n").length,
    bytes: Buffer.byteLength(content, "utf-8"),
  };
}

export async function deleteProjectMemoryFile(projectPath: string, fileName: string): Promise<void> {
  const memDir = resolveProjectMemoryDir(projectPath);
  const full = path.join(memDir, fileName);
  if (await exists(full)) {
    await fs.unlink(full);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/services/memory.service.ts && git commit -m "feat: add project memory service"
```

### Task 12: Create project memory routes

**Files:**
- Create: `server/src/routes/memory.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Create memory.ts routes**

```typescript
import { Router } from "express";
import * as memoryService from "../services/memory.service.js";
import * as projectService from "../services/project.service.js";

const router = Router();

router.get("/:projectId", async (req, res) => {
  const project = await projectService.getProject(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });
  const files = await memoryService.getProjectMemory(project.path);
  res.json(files);
});

router.put("/:projectId/:fileName", async (req, res) => {
  const project = await projectService.getProject(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });
  const { content } = req.body;
  if (content === undefined) return res.status(400).json({ error: "content is required" });
  const file = await memoryService.updateProjectMemoryFile(project.path, req.params.fileName, content);
  res.json(file);
});

router.delete("/:projectId/:fileName", async (req, res) => {
  const project = await projectService.getProject(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });
  await memoryService.deleteProjectMemoryFile(project.path, req.params.fileName);
  res.status(204).end();
});

export default router;
```

- [ ] **Step 2: Register routes in index.ts**

In `server/src/index.ts`, add:

```typescript
import memoryRoutes from "./routes/memory.js";
```

and:

```typescript
app.use("/api/memory", memoryRoutes);
```

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/memory.ts server/src/index.ts && git commit -m "feat: add project memory REST endpoints"
```

### Task 13: Add project memory API to client

**Files:**
- Modify: `client/src/services/api.ts`

- [ ] **Step 1: Add project memory methods**

In `client/src/services/api.ts`, add to the `api` object:

```typescript
  getProjectMemory: (projectId: string) =>
    request<Array<{ name: string; path: string; content: string; lastModified: string; lines: number; bytes: number }>>(`/api/memory/${projectId}`),

  updateProjectMemoryFile: (projectId: string, fileName: string, content: string) =>
    request(`/api/memory/${projectId}/${fileName}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    }),

  deleteProjectMemoryFile: (projectId: string, fileName: string) =>
    request<void>(`/api/memory/${projectId}/${fileName}`, { method: "DELETE" }),
```

- [ ] **Step 2: Verify and commit**

```bash
npm run dev
# Test: curl http://localhost:3456/api/memory/user
# Should return memory files for user scope
```

```bash
git add client/src/services/api.ts && git commit -m "feat: add project memory API methods to client"
```

---

## Phase 7: Global Chat Modal

### Task 14: Build GlobalChatModal

**Files:**
- Create: `client/src/components/GlobalChatModal.tsx`

- [ ] **Step 1: Create GlobalChatModal.tsx**

```tsx
import { useState } from "react";
import { X, Minus, MessageSquare } from "lucide-react";
import AgentChat from "./AgentChat";

export default function GlobalChatModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [minimized, setMinimized] = useState(false);
  const [title, setTitle] = useState("Claude Code");
  const [editingTitle, setEditingTitle] = useState(false);

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl hover:bg-gray-700 transition-colors"
      >
        <MessageSquare size={14} className="text-cyan-400" />
        <span className="text-sm font-medium text-white">{title}</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-[700px] h-[80vh] bg-gray-900 border border-gray-700 rounded-2xl flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 rounded-t-2xl bg-gray-900">
          <div className="flex items-center gap-2">
            <MessageSquare size={14} className="text-cyan-400" />
            {editingTitle ? (
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
                className="bg-gray-800 border border-cyan-500/50 rounded px-2 py-0.5 text-sm text-white focus:outline-none w-48"
                autoFocus
              />
            ) : (
              <span
                onDoubleClick={() => setEditingTitle(true)}
                className="text-sm font-bold text-white cursor-text"
                title="Double-click to rename"
              >
                {title}
              </span>
            )}
            <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">global</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMinimized(true)}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              title="Minimize"
            >
              <Minus size={14} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Chat content */}
        <div className="flex-1 min-h-0 p-3">
          <AgentChat agentName="_main" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/GlobalChatModal.tsx && git commit -m "feat: add GlobalChatModal with minimize and title editing"
```

### Task 15: Wire GlobalChatModal into App.tsx

**Files:**
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Replace side-panel chat with modal**

In `client/src/App.tsx`, replace the import:

```typescript
// REMOVE: import AgentChat from "./components/AgentChat";
import GlobalChatModal from "./components/GlobalChatModal";
```

Replace the chat overlay at the bottom of the component (the `{chatOpen && (...)}` block) with:

```tsx
{chatOpen && <GlobalChatModal onClose={() => setChatOpen(false)} />}
```

- [ ] **Step 2: Verify and commit**

```bash
npm run dev
# Check: "Chat" button opens a centered modal (not side panel)
# Modal shows "global" badge
# Double-click title to rename
# Minimize button collapses to bottom-right pill
# Clicking pill re-opens modal
# Clicking backdrop closes modal
```

```bash
git add client/src/App.tsx && git commit -m "feat: replace side-panel chat with GlobalChatModal"
```

### Task 16: Delete ChatPanel (now unused)

**Files:**
- Delete: `client/src/components/ChatPanel.tsx`

- [ ] **Step 1: Verify ChatPanel is not imported anywhere**

```bash
grep -r "ChatPanel" client/src/ --include="*.tsx" --include="*.ts"
```

If no results (or only the file itself), delete it.

- [ ] **Step 2: Delete and commit**

```bash
rm client/src/components/ChatPanel.tsx
git add -A && git commit -m "chore: remove unused ChatPanel component"
```

---

## Phase 8: Final Cleanup

### Task 17: Remove unused Sidebar component and concurrently dependency

**Files:**
- Delete: `client/src/components/Sidebar.tsx` (not used — ProjectDashboard has its own inline sidebar)
- Modify: `package.json` (remove `concurrently` — backend now runs in Docker)

- [ ] **Step 1: Verify Sidebar is not imported**

```bash
grep -r "Sidebar" client/src/ --include="*.tsx" --include="*.ts"
```

If only `Sidebar.tsx` itself appears, delete it.

- [ ] **Step 2: Remove concurrently**

```bash
npm uninstall concurrently
```

In `package.json`, remove or update the `dev` script that used `concurrently`:

```json
{
  "scripts": {
    "start": "./start.sh",
    "dev": "npm run dev:client",
    "dev:server": "cd server && npm run dev",
    "dev:client": "cd client && npm run dev",
    "build": "npm run build:server && npm run build:client",
    "build:server": "cd server && npm run build",
    "build:client": "cd client && npm run build"
  }
}
```

- [ ] **Step 3: Delete Sidebar and commit**

```bash
rm client/src/components/Sidebar.tsx
git add -A && git commit -m "chore: remove unused Sidebar, uninstall concurrently"
```

### Task 18: Final verification

- [ ] **Step 1: Full visual test**

```bash
npm start
```

Verify all of the following in the browser:

1. **Project selection**: home page shows project cards, selecting one opens dashboard
2. **Scope tabs**: sidebar shows "Project | User" tabs (for non-user projects)
3. **Agent tree**: "Tree" tab shows hierarchical view, orchestrators collapsible
4. **Agent detail**: 5 tabs (Overview, Chat, Prompt, Memory, Files)
5. **Memory manager**: Memory tab shows MEMORY.md with size gauges, topic files collapsible
6. **Global chat**: top-right Chat button opens centered modal, minimizable
7. **Costs tab**: still works
8. **Favorites**: still work
9. **Link/Unlink**: user agents can be linked to projects
10. **SSE events**: active agents show green pulse and context gauge

- [ ] **Step 2: Clean up any TypeScript errors**

```bash
cd client && npx tsc --noEmit
cd ../server && npx tsc --noEmit
```

Fix any errors found.

- [ ] **Step 3: Final commit**

```bash
git add -A && git commit -m "chore: fix any remaining TypeScript errors from v2 refactor"
```
