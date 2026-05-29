# Frontend state management refactor — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace prop drilling in `ProjectDashboard` and its descendants with 1 React Context (`ProjectContext`) + 5 Zustand stores, while preserving exactly the current user-visible behavior.

**Architecture:** Each phase introduces one store or one context, migrates its consumers to read via selectors / `useProject()`, removes the corresponding props from the chain, then ends with typecheck + lint + manual smoke test + one commit.

**Tech Stack:** React 19, Zustand 5, TypeScript 6, electron-vite. The codebase has no unit test suite — verification per phase = `npm run typecheck` + `npm run lint` + manual smoke in `npm run dev`.

**Spec:** `docs/superpowers/specs/2026-05-29-frontend-state-management-refactor-design.md`

---

## File map

### New files

| Path | Responsibility |
|---|---|
| `src/store/useEventsStore.ts` | Real-time IPC events (events, activeAgents, agentContexts, currentTools, waitingAgents, connected) + setup hook |
| `src/store/useDashboardStore.ts` | agents, skills, hooks of the current project + load/refresh/toggleLink/deleteAgent actions |
| `src/store/useDashboardUIStore.ts` | UI state shared between sidebar and main pane (view, selectedAgent, selectedSkill, selectedSessionId, openPanels, scopeTab, resumeChat) |
| `src/store/useChatsStore.ts` | openChats + addOpenChat + updateChatTitle + auto-titles setup hook |
| `src/store/useFavoritesStore.ts` | favorites keyed by projectId + isFavorite + toggle + load |
| `src/store/ProjectContext.tsx` | `<ProjectProvider>` + `useProject()` hook exposing `{ project, projectId, projectName, projectPath, isUserProject, refresh }` |
| `src/types/dashboard.types.ts` | Shared types: `Project`, `SkillFile`, `HookConfig`, `SkillAnnexFile`, `SkillMetadata` (extracted from `useProjects.ts`) |
| `src/types/events.types.ts` | Shared types: `LiveEvent`, `AgentContext` (extracted from `useIPC.ts`) |

### Files to delete (after consumers migrated)

| Path | When |
|---|---|
| `src/hooks/useIPC.ts` | End of Phase 1 |
| `src/hooks/useFavorites.ts` | End of Phase 4 |
| `src/hooks/useAutoChatTitles.ts` | End of Phase 6 |

### Files to keep but slim down

| Path | Change |
|---|---|
| `src/hooks/useProjects.ts` | Keep `useProjects` (projects list scan). Remove `useDashboard` (moved to store). Re-export types from `src/types/dashboard.types.ts` for backward compat. |
| `src/hooks/useSessions.ts` | Unchanged in this refactor (YAGNI — only 2 consumers). |
| `src/store/useAppStore.ts` | Unchanged. Keep `selectedProject` + `setSelectedProject` as the entry point for project switching. |

---

## Phase 1 — `useEventsStore` (replaces `useIPC`)

### Task 1.1: Extract event types

**Files:**
- Create: `src/types/events.types.ts`

- [ ] **Step 1: Create the types file**

```ts
// src/types/events.types.ts
export type LiveEvent = {
  id: number;
  agent_name: string;
  session_id: string | null;
  event_type: string;
  tool_name: string | null;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  created_at: string;
};

export type AgentContext = {
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  percent: number;
};
```

### Task 1.2: Create the events store

**Files:**
- Create: `src/store/useEventsStore.ts`

- [ ] **Step 1: Create the store with state + ingest action + setup hook**

```ts
// src/store/useEventsStore.ts
import { useEffect } from "react";
import { create } from "zustand";

import type { AgentContext, LiveEvent } from "@/types/events.types";

const DEFAULT_LIMIT = 200_000;
const ACTIVE_TIMEOUT_MS = 5000;

type IPCEvent =
  | ({ type: "event" } & LiveEvent)
  | { type: "spawn_usage"; agentName: string; tokensIn?: number; tokensOut?: number }
  | { type: "session_activity"; agentName?: string; tokensIn?: number; tokensOut?: number }
  | { type: "spawn_input_request"; agentName?: string }
  | { type: "spawn_exit"; agentName?: string };

type EventsState = {
  events: LiveEvent[];
  connected: boolean;
  activeAgents: Set<string>;
  agentContexts: Map<string, AgentContext>;
  currentTools: Map<string, string>;
  waitingAgents: Set<string>;
  setConnected: (connected: boolean) => void;
  ingest: (raw: unknown) => void;
  expireActive: (agentName: string) => void;
};

export const useEventsStore = create<EventsState>((set, get) => ({
  events: [],
  connected: false,
  activeAgents: new Set(),
  agentContexts: new Map(),
  currentTools: new Map(),
  waitingAgents: new Set(),

  setConnected: (connected) => set({ connected }),

  expireActive: (agentName) =>
    set((s) => {
      const nextActive = new Set(s.activeAgents);
      nextActive.delete(agentName);
      const nextTools = new Map(s.currentTools);
      nextTools.delete(agentName);
      return { activeAgents: nextActive, currentTools: nextTools };
    }),

  ingest: (raw) => {
    const data = raw as IPCEvent;
    const markActive = (agentName: string, tokensIn: number, tokensOut: number, costUsd: number, toolName?: string) => {
      const s = get();
      const nextActive = new Set(s.activeAgents).add(agentName);

      let nextContexts = s.agentContexts;
      if (tokensIn > 0 || tokensOut > 0) {
        nextContexts = new Map(s.agentContexts);
        const existing = nextContexts.get(agentName) || { tokensIn: 0, tokensOut: 0, costUsd: 0, percent: 0 };
        const newIn = existing.tokensIn + tokensIn;
        const newOut = existing.tokensOut + tokensOut;
        const total = newIn + newOut;
        nextContexts.set(agentName, {
          tokensIn: newIn,
          tokensOut: newOut,
          costUsd: existing.costUsd + costUsd,
          percent: Math.min((total / DEFAULT_LIMIT) * 100, 100),
        });
      }

      let nextTools = s.currentTools;
      if (toolName) {
        nextTools = new Map(s.currentTools);
        nextTools.set(agentName, toolName);
      }

      set({ activeAgents: nextActive, agentContexts: nextContexts, currentTools: nextTools });

      const existingTimer = activeTimers.get(agentName);
      if (existingTimer) clearTimeout(existingTimer);
      activeTimers.set(
        agentName,
        setTimeout(() => {
          activeTimers.delete(agentName);
          get().expireActive(agentName);
        }, ACTIVE_TIMEOUT_MS)
      );
    };

    if (data.type === "event") {
      set((s) => ({ events: [data, ...s.events].slice(0, 200) }));
      markActive(data.agent_name, data.tokens_in || 0, data.tokens_out || 0, data.cost_usd || 0, data.tool_name || undefined);
      return;
    }
    if (data.type === "spawn_usage") {
      markActive(data.agentName, data.tokensIn || 0, data.tokensOut || 0, 0);
      if (data.agentName) {
        set((s) => {
          const next = new Set(s.waitingAgents);
          next.delete(data.agentName);
          return { waitingAgents: next };
        });
      }
      return;
    }
    if (data.type === "session_activity") {
      markActive(data.agentName || "unknown", data.tokensIn || 0, data.tokensOut || 0, 0);
      if (data.agentName) {
        const name = data.agentName;
        set((s) => {
          const next = new Set(s.waitingAgents);
          next.delete(name);
          return { waitingAgents: next };
        });
      }
      return;
    }
    if (data.type === "spawn_input_request" && data.agentName) {
      const name = data.agentName;
      set((s) => ({ waitingAgents: new Set(s.waitingAgents).add(name) }));
      return;
    }
    if (data.type === "spawn_exit" && data.agentName) {
      const name = data.agentName;
      set((s) => {
        const next = new Set(s.waitingAgents);
        next.delete(name);
        return { waitingAgents: next };
      });
    }
  },
}));

const activeTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function useInitEvents() {
  useEffect(() => {
    useEventsStore.getState().setConnected(true);
    const cleanup = window.api.onEvent((raw) => {
      useEventsStore.getState().ingest(raw);
    });
    return cleanup;
  }, []);
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS (the new store file compiles; the rest of the app still uses `useIPC` so nothing else breaks yet)

### Task 1.3: Wire the store in `App.tsx` and remove the prop chain

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/ProjectDashboard/ProjectDashboard.tsx`
- Modify: `src/components/ProjectDashboard/PanelsArea/PanelsArea.tsx`
- Modify: `src/components/ProjectDashboard/MainContent/MainContent.tsx`
- Modify: `src/components/ProjectDashboard/ActiveSessions/ActiveSessions.tsx`
- Modify: `src/components/ProjectDashboard/OpenChatsList/OpenChatsList.tsx`
- Modify: `src/components/ProjectDashboard/AgentList/AgentList.tsx`
- Modify: `src/components/ProjectDashboard/OrchestratorTree/OrchestratorTree.tsx`
- Modify: `src/components/ProjectDashboard/AgentRow/AgentRow.tsx`
- Modify: `src/components/AgentTree/AgentTree.tsx`
- Modify: `src/components/AgentTree/TreeNode/TreeNode.tsx`

- [ ] **Step 1: Replace `useIPC()` in `App.tsx` with `useInitEvents()` + selectors**

Find in `src/App.tsx`:
```tsx
import { useIPC } from "./hooks/useIPC";
// ...
const { events, connected, activeAgents, agentContexts, currentTools, waitingAgents } = useIPC();
const { stats } = useStats(events.length);
```

Replace with:
```tsx
import { useInitEvents, useEventsStore } from "./store/useEventsStore";
// ...
useInitEvents();
const eventsLength = useEventsStore((s) => s.events.length);
const connected = useEventsStore((s) => s.connected);
const activeCount = useEventsStore((s) => s.activeAgents.size);
const { stats } = useStats(eventsLength);
```

Find:
```tsx
<StatsBar stats={stats} activeCount={activeAgents.size} connected={connected} />
```

Replace with:
```tsx
<StatsBar stats={stats} activeCount={activeCount} connected={connected} />
```

Find the `<ProjectDashboard ... />` JSX. Remove the props `activeAgents`, `agentContexts`, `currentTools`, `waitingAgents`. Keep the rest:
```tsx
<ProjectDashboard
  project={dashboard.project}
  agents={dashboard.agents}
  skills={dashboard.skills}
  hooks={dashboard.hooks}
  onRefresh={refresh}
/>
```

Find the `<EventConsole ... />` JSX and change `events={events}` to read from the store. Pass `useEventsStore.getState().events` only at this top level by selecting it:
```tsx
const events = useEventsStore((s) => s.events);
// ...
<EventConsole events={events} agentColorMap={agentColorMap} />
```

- [ ] **Step 2: Remove the 4 IPC props from `ProjectDashboardProps` and stop drilling them**

In `src/components/ProjectDashboard/ProjectDashboard.tsx`:

Remove from `ProjectDashboardProps`:
```ts
  activeAgents: Set<string>;
  agentContexts: Map<string, AgentContext>;
  currentTools?: Map<string, string>;
  waitingAgents?: Set<string>;
```

Remove from the destructure and from imports (`import type { AgentContext } from '@/hooks/useIPC';` → delete).

In the JSX, remove those props from the calls to `<ActiveSessions>`, `<OpenChatsList>`, `<PanelsArea>`, `<MainContent>`.

- [ ] **Step 3: Update `PanelsArea` to read from the store**

In `src/components/ProjectDashboard/PanelsArea/PanelsArea.tsx`:

Remove from imports:
```ts
import type { AgentContext } from '@/hooks/useIPC';
```

Remove from `PanelsAreaProps`:
```ts
  activeAgents: Set<string>;
  agentContexts: Map<string, AgentContext>;
```

Remove `activeAgents`, `agentContexts` from the destructure.

For each `<AgentList ... />` call site, remove `activeAgents={activeAgents}` and `agentContexts={agentContexts}`.

- [ ] **Step 4: Update `MainContent` to read from the store**

In `src/components/ProjectDashboard/MainContent/MainContent.tsx`:

Remove from imports:
```ts
import type { AgentContext } from '@/hooks/useIPC';
```

Remove from `MainContentProps`:
```ts
  activeAgents: Set<string>;
  agentContexts: Map<string, AgentContext>;
  currentTools?: Map<string, string>;
```

Remove from destructure.

For the `<AgentTree ... />` call, remove `activeAgents`, `agentContexts`, `currentTools` props.

- [ ] **Step 5: Update `ActiveSessions`**

In `src/components/ProjectDashboard/ActiveSessions/ActiveSessions.tsx`:

Remove `AgentContext` import. Remove `activeAgents`, `agentContexts`, `waitingAgents` from props type.

In the component body, add:
```ts
import { useEventsStore } from "@/store/useEventsStore";
// at top of function:
const activeAgents = useEventsStore((s) => s.activeAgents);
const agentContexts = useEventsStore((s) => s.agentContexts);
const waitingAgents = useEventsStore((s) => s.waitingAgents);
```

(Read full file first to merge the change cleanly.)

- [ ] **Step 6: Update `OpenChatsList`**

In `src/components/ProjectDashboard/OpenChatsList/OpenChatsList.tsx`:

Remove `activeAgents` prop from props type. Add:
```ts
import { useEventsStore } from "@/store/useEventsStore";
// inside component:
const activeAgents = useEventsStore((s) => s.activeAgents);
```

- [ ] **Step 7: Update `AgentList`**

In `src/components/ProjectDashboard/AgentList/AgentList.tsx`:

Remove `AgentContext` import. Remove `activeAgents`, `agentContexts` from props (they were only forwarded down). Remove their destructure.

For each `<OrchestratorTree ... />` and `<AgentRow ... />` call site, remove `activeAgents` / `agentContexts` / `active` / `context` props (the rows will read directly from the store — see Step 9).

- [ ] **Step 8: Update `OrchestratorTree`**

In `src/components/ProjectDashboard/OrchestratorTree/OrchestratorTree.tsx`:

Remove `AgentContext` import. Remove `activeAgents`, `agentContexts` from props. Remove their destructure. Remove them from any forwarded `<AgentRow>` / nested `<OrchestratorTree>` calls.

- [ ] **Step 9: Update `AgentRow` — leaf reads via selectors**

In `src/components/ProjectDashboard/AgentRow/AgentRow.tsx`:

Replace the imports + props:
```tsx
import { Link, Unlink } from "lucide-react";

import { AgentContextMenu } from '@/components/AgentContextMenu/AgentContextMenu';
import { useEventsStore } from '@/store/useEventsStore';
import type { AgentFile } from '@/types/agent.types';

import { ContextBar } from '../ContextBar/ContextBar';
import { colorMap } from '../utils';

export type AgentRowProps = {
  agent: AgentFile;
  selected: boolean;
  onSelect: (a: AgentFile) => void;
  onAgentAction: (action: string, agentName: string) => void;
  onToggleLink?: (name: string) => void;
  linkAction?: "link" | "unlink";
  isAgentFavorite?: (name: string) => boolean;
};

export function AgentRow({
  agent,
  selected,
  onSelect,
  onAgentAction,
  onToggleLink,
  linkAction,
  isAgentFavorite,
}: AgentRowProps) {
  const active = useEventsStore((s) => s.activeAgents.has(agent.id));
  const context = useEventsStore((s) => s.agentContexts.get(agent.id));
  // ... rest unchanged
}
```

The rest of the JSX is unchanged — it already uses `active` and `context` locals.

- [ ] **Step 10: Update `AgentTree` and `TreeNode`**

In `src/components/AgentTree/AgentTree.tsx`:

Remove `AgentContext` import. Remove `activeAgents`, `agentContexts`, `currentTools` from props. Remove their destructure. Remove them from any forwarded `<TreeNode>` calls.

In `src/components/AgentTree/TreeNode/TreeNode.tsx`:

Read the file, remove `activeAgents`/`agentContexts`/`currentTools` props, and inside the component add:
```tsx
import { useEventsStore } from '@/store/useEventsStore';

// inside function, where the row is rendered with a specific agent id:
const active = useEventsStore((s) => s.activeAgents.has(agentId));
const context = useEventsStore((s) => s.agentContexts.get(agentId));
const tool = useEventsStore((s) => s.currentTools.get(agentId));
```

(Read full file first — `TreeNode` is recursive; remove the props from its recursive call to itself.)

- [ ] **Step 11: Delete `useIPC.ts`**

Run: `rm src/hooks/useIPC.ts`

- [ ] **Step 12: Verify nothing imports the deleted file**

Run: `grep -rn "from '@/hooks/useIPC'\|from './hooks/useIPC'\|from '../hooks/useIPC'" src/`
Expected: no output.

- [ ] **Step 13: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: both clean.

- [ ] **Step 14: Manual smoke test**

Run: `npm run dev`
- Select a project from the home grid.
- Open the Agents accordion in the sidebar.
- Trigger an agent (or watch an existing session). Verify the green dot lights up on the AgentRow and the context bar fills.
- Open the Tree view (main pane). Verify the same.
- Open the Active Sessions panel (top of sidebar). Verify it populates with live agents.
- Open the chat (top-right button). Confirm StatsBar shows non-zero active count when an agent runs.

If any of the above behaves differently from before, debug before committing.

- [ ] **Step 15: Commit**

```bash
git add -u src/ docs/
git add src/store/useEventsStore.ts src/types/events.types.ts
git commit -m "refactor(state): replace useIPC with useEventsStore

Real-time IPC events now live in a Zustand store. AgentRow and TreeNode
read 'active' and 'context' via selectors keyed on agent.id, eliminating
the 4 props drilled through ProjectDashboard/PanelsArea/MainContent.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 2 — `useDashboardStore` (replaces `useDashboard`)

### Task 2.1: Extract dashboard types

**Files:**
- Create: `src/types/dashboard.types.ts`
- Modify: `src/hooks/useProjects.ts`

- [ ] **Step 1: Create the types file**

```ts
// src/types/dashboard.types.ts
export type Project = {
  id: string;
  name: string;
  path: string;
  claudeDir: string;
  hasAgents: boolean;
  hasSkills: boolean;
  hasSettings: boolean;
  agentCount: number;
  skillCount: number;
};

export type SkillMetadata = {
  author?: string;
  version?: string;
  created?: string;
  last_reviewed?: string;
  review_interval_days?: number;
  [key: string]: unknown;
};

export type SkillAnnexFile = {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
};

export type SkillFile = {
  name: string;
  description: string;
  filePath: string;
  scope: "project" | "user";
  body: string;
  lineCount: number;
  license?: string;
  metadata?: SkillMetadata;
  annexFiles: SkillAnnexFile[];
};

export type HookConfig = {
  event: string;
  matcher: string;
  command: string;
};
```

- [ ] **Step 2: Slim down `useProjects.ts`**

Replace the whole file with:
```ts
// src/hooks/useProjects.ts
import { useCallback, useEffect, useState } from "react";

import type { Project } from "@/types/dashboard.types";

export type { HookConfig, Project, SkillAnnexFile, SkillFile, SkillMetadata } from "@/types/dashboard.types";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await window.api.getProjects();
    setProjects(data);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { projects, loading, refresh };
}
```

(Re-exports preserve backward compatibility for existing `import type { ... } from '@/hooks/useProjects'` until we move them in Phase 7.)

### Task 2.2: Create the dashboard store

**Files:**
- Create: `src/store/useDashboardStore.ts`

- [ ] **Step 1: Create the store**

```ts
// src/store/useDashboardStore.ts
import { create } from "zustand";

import type { HookConfig, Project, SkillFile } from "@/types/dashboard.types";
import type { AgentFile } from "@/types/agent.types";

type DashboardState = {
  project: Project | null;
  agents: AgentFile[];
  skills: SkillFile[];
  hooks: HookConfig[];
  loading: boolean;
  load: (projectId: string) => Promise<void>;
  refresh: () => Promise<void>;
  toggleLink: (agentName: string, currentlyLinked: boolean) => Promise<void>;
  deleteAgent: (agentName: string) => Promise<void>;
};

export const useDashboardStore = create<DashboardState>((set, get) => ({
  project: null,
  agents: [],
  skills: [],
  hooks: [],
  loading: false,

  load: async (projectId: string) => {
    set({ loading: true });
    const data = await window.api.getDashboard(projectId);
    set({
      project: data.project,
      agents: data.agents,
      skills: data.skills,
      hooks: data.hooks,
      loading: false,
    });
  },

  refresh: async () => {
    const id = get().project?.id;
    if (!id) return;
    await get().load(id);
  },

  toggleLink: async (agentName, currentlyLinked) => {
    const id = get().project?.id;
    if (!id) return;
    if (currentlyLinked) {
      await window.api.unlinkAgent(agentName, id);
    } else {
      await window.api.linkAgent(agentName, id);
    }
    await get().refresh();
  },

  deleteAgent: async (agentName) => {
    await window.api.deleteAgent(agentName);
    await get().refresh();
  },
}));
```

### Task 2.3: Wire the store in `App.tsx` and stop drilling dashboard data

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/ProjectDashboard/ProjectDashboard.tsx`
- Modify: `src/components/ProjectDashboard/PanelsArea/PanelsArea.tsx`
- Modify: `src/components/ProjectDashboard/MainContent/MainContent.tsx`
- Modify: `src/components/ProjectDashboard/ActiveSessions/ActiveSessions.tsx`
- Modify: `src/components/ProjectDashboard/OpenChatsList/OpenChatsList.tsx`

- [ ] **Step 1: Replace `useDashboard()` in `App.tsx`**

Find:
```tsx
import { useDashboard,useProjects } from "./hooks/useProjects";
// ...
const { dashboard, loading: dashLoading, refresh } = useDashboard(selectedProject?.id ?? null);
```

Replace with:
```tsx
import { useProjects } from "./hooks/useProjects";
import { useDashboardStore } from "./store/useDashboardStore";
import { useEffect } from "react";
// ...
const project = useDashboardStore((s) => s.project);
const agents = useDashboardStore((s) => s.agents);
const skills = useDashboardStore((s) => s.skills);
const hooks = useDashboardStore((s) => s.hooks);
const dashLoading = useDashboardStore((s) => s.loading);
const loadDashboard = useDashboardStore((s) => s.load);
const refresh = useDashboardStore((s) => s.refresh);

useEffect(() => {
  if (selectedProject?.id) {
    void loadDashboard(selectedProject.id);
  }
}, [selectedProject?.id, loadDashboard]);

const dashboard = project ? { project, agents, skills, hooks } : null;
```

The rest of the JSX (which uses `dashboard.project`, `dashboard.agents`, etc.) keeps working as-is for this phase.

- [ ] **Step 2: Stop passing `agents`/`skills`/`hooks` to `ProjectDashboard`**

In `src/App.tsx`, change the `<ProjectDashboard>` JSX to:
```tsx
<ProjectDashboard project={dashboard.project} onRefresh={refresh} />
```

In `src/components/ProjectDashboard/ProjectDashboard.tsx`:

Remove from `ProjectDashboardProps`:
```ts
  agents: AgentFile[];
  skills: SkillFile[];
  hooks: HookConfig[];
```

Remove from destructure. Inside the component, read from the store instead:
```tsx
import { useDashboardStore } from '@/store/useDashboardStore';
// ...
const agents = useDashboardStore((s) => s.agents);
const skills = useDashboardStore((s) => s.skills);
const hooks = useDashboardStore((s) => s.hooks);
```

The rest of the component (filters: `projectAgents`, `userAgents`, etc.) compiles unchanged.

- [ ] **Step 3: Replace `handleToggleLink` with the store action**

In `ProjectDashboard.tsx`, find:
```tsx
const handleToggleLink = async (agentName: string, currentlyLinked: boolean) => {
  if (currentlyLinked) {
    await window.api.unlinkAgent(agentName, project.id);
  } else {
    await window.api.linkAgent(agentName, project.id);
  }
  onRefresh();
};
```

Replace with:
```tsx
const toggleLink = useDashboardStore((s) => s.toggleLink);
const handleToggleLink = (agentName: string, currentlyLinked: boolean) => toggleLink(agentName, currentlyLinked);
```

Find:
```tsx
case "delete":
  if (confirm(`Delete agent "${agentName}"?`)) {
    window.api.deleteAgent(agentName).then(() => onRefresh());
  }
  break;
```

Replace with:
```tsx
case "delete": {
  if (confirm(`Delete agent "${agentName}"?`)) {
    void useDashboardStore.getState().deleteAgent(agentName);
  }
  break;
}
```

- [ ] **Step 4: Remove `agents`/`skills`/`hooks` from `PanelsArea`**

In `src/components/ProjectDashboard/PanelsArea/PanelsArea.tsx`:

Remove from props type: `agents`, `skills`, `hooks`. Remove `HookConfig`/`SkillFile` imports if unused after this. Remove their destructure.

Inside the component, read from the store:
```tsx
import { useDashboardStore } from '@/store/useDashboardStore';
// at top of function:
const agents = useDashboardStore((s) => s.agents);
const skills = useDashboardStore((s) => s.skills);
const hooks = useDashboardStore((s) => s.hooks);
```

Update `ProjectDashboard.tsx`'s `<PanelsArea>` JSX to drop those props.

- [ ] **Step 5: Remove `agents` from `MainContent`**

In `src/components/ProjectDashboard/MainContent/MainContent.tsx`:

Remove `agents` from props type and destructure. Read from store inside:
```tsx
import { useDashboardStore } from '@/store/useDashboardStore';
// at top of function:
const agents = useDashboardStore((s) => s.agents);
```

Update the caller in `ProjectDashboard.tsx`.

- [ ] **Step 6: Remove `agents` from `ActiveSessions` and `OpenChatsList`**

Both components currently take `agents` as a prop. Remove it, replace with:
```tsx
const agents = useDashboardStore((s) => s.agents);
```

Update the callers in `ProjectDashboard.tsx`.

- [ ] **Step 7: Typecheck + lint**

Run: `npm run typecheck && npm run lint`

- [ ] **Step 8: Manual smoke test**

Run: `npm run dev`
- Switch between two projects from the project switcher — confirm sidebar updates.
- Link/unlink a user agent to a project — confirm the agent moves between scopes (Project / User tabs in sidebar).
- Delete a non-essential agent (if you have one to spare) — confirm the list refreshes.

- [ ] **Step 9: Commit**

```bash
git add -u src/ docs/ ; git add src/store/useDashboardStore.ts src/types/dashboard.types.ts
git commit -m "refactor(state): replace useDashboard with useDashboardStore

agents/skills/hooks and the refresh/toggleLink/deleteAgent actions now
live in a Zustand store. App and ProjectDashboard stop drilling them.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 3 — `ProjectContext` (eliminate `onRefresh` 7-level drill + project metadata drill)

### Task 3.1: Create the context

**Files:**
- Create: `src/store/ProjectContext.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/store/ProjectContext.tsx
import { createContext, type ReactNode, useContext, useMemo } from "react";

import { useDashboardStore } from "./useDashboardStore";
import type { Project } from "@/types/dashboard.types";

type ProjectContextValue = {
  project: Project;
  projectId: string;
  projectName: string;
  projectPath: string;
  isUserProject: boolean;
  refresh: () => Promise<void>;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ project, children }: { project: Project; children: ReactNode }) {
  const refresh = useDashboardStore((s) => s.refresh);
  const value = useMemo<ProjectContextValue>(
    () => ({
      project,
      projectId: project.id,
      projectName: project.name || project.id,
      projectPath: project.path,
      isUserProject: project.id === "user",
      refresh,
    }),
    [project, refresh]
  );
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}
```

### Task 3.2: Mount the provider in `App.tsx` and stop drilling `onRefresh`/`project*`

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/ProjectDashboard/ProjectDashboard.tsx`
- Modify: `src/components/ProjectDashboard/MainContent/MainContent.tsx`
- Modify: `src/components/ProjectDashboard/PanelsArea/PanelsArea.tsx`
- Modify: `src/components/AgentDetail/AgentDetail.tsx`
- Modify: `src/components/MemoryManager/MemoryManager.tsx`
- Modify: `src/components/ProjectDashboard/MainContent/LandingPage.tsx`

- [ ] **Step 1: Wrap `ProjectDashboard` in `ProjectProvider`**

In `src/App.tsx`, find:
```tsx
) : dashboard ? (
  <ProjectDashboard project={dashboard.project} onRefresh={refresh} />
) : null}
```

Replace with:
```tsx
) : dashboard ? (
  <ProjectProvider project={dashboard.project}>
    <ProjectDashboard />
  </ProjectProvider>
) : null}
```

Add the import:
```tsx
import { ProjectProvider } from "./store/ProjectContext";
```

- [ ] **Step 2: Remove `project` + `onRefresh` from `ProjectDashboardProps`**

In `src/components/ProjectDashboard/ProjectDashboard.tsx`:

Remove `project` and `onRefresh` from `ProjectDashboardProps`. The type becomes:
```ts
export type ProjectDashboardProps = Record<string, never>;
```

Remove destructure of `project` and `onRefresh`.

Add at top of function:
```tsx
import { useProject } from '@/store/ProjectContext';
// ...
const { project } = useProject();
```

The local `isUserProject = project.id === "user"` line can be replaced by reading from context (`const { isUserProject } = useProject();`) — but `project` is still needed for `useSessions(project.path)`, `useFavorites(project.id)`, etc. so keep both.

Update `App.tsx` JSX call (already done in step 1).

Inside `ProjectDashboard.tsx`, remove any `onRefresh()` call and replace with `refresh()` from context:
```tsx
const { project, refresh } = useProject();
// replace `onRefresh()` calls with `refresh()`
```

Update the `<PanelsArea>` and `<MainContent>` JSX: remove the `onRefresh={onRefresh}` prop.

- [ ] **Step 3: Update `PanelsArea` to use `useProject()`**

In `src/components/ProjectDashboard/PanelsArea/PanelsArea.tsx`:

Remove `onRefresh` from props type and destructure. Inside, use context:
```tsx
import { useProject } from '@/store/ProjectContext';
// ...
const { refresh } = useProject();
```

Find `onRefresh={onRefresh}` in the `<Accordion>` JSX and replace with `onRefresh={refresh}`.

- [ ] **Step 4: Update `MainContent` to drop `onRefresh`, `projectName`, `projectId`, `projectPath`**

In `src/components/ProjectDashboard/MainContent/MainContent.tsx`:

Remove from props type: `onRefresh`, `projectName`, `projectId`, `projectPath`. Remove their destructure.

Inside the component:
```tsx
import { useProject } from '@/store/ProjectContext';
// ...
const { projectName, projectId, projectPath, refresh } = useProject();
```

Replace `onRefresh={onRefresh}` in the `<AgentDetail>` JSX with `onRefresh={refresh}`.

Update `LandingPage` JSX call: keep `projectName`/`projectId`/`projectPath` props for now if you don't want to refactor `LandingPage` in this phase (you can drop them in Step 6 below).

Update the caller in `ProjectDashboard.tsx` to drop the 4 dropped props.

- [ ] **Step 5: Update `AgentDetail` to read `refresh` from context (kill the long chain)**

Read `src/components/AgentDetail/AgentDetail.tsx`. Replace the `onRefresh` prop usage with the context:

Remove `onRefresh` from `AgentDetailProps`. Remove from destructure.

Add:
```tsx
import { useProject } from '@/store/ProjectContext';
// ...
const { refresh } = useProject();
```

Replace all `onRefresh()` calls with `refresh()`.

Update calls to `<MemoryManager>` to drop `onRefresh` if it was being forwarded.

- [ ] **Step 6: Update `MemoryManager` to use context**

Read `src/components/MemoryManager/MemoryManager.tsx`. Same treatment: remove `onRefresh` from its props (and any `MemoryFileCard` or sub-components that take it), and call `useProject()` where needed.

- [ ] **Step 7: Update `LandingPage` to use context**

In `src/components/ProjectDashboard/MainContent/LandingPage.tsx`: remove `projectName`/`projectId`/`projectPath` from props. Replace with `const { projectName, projectId, projectPath } = useProject();`.

- [ ] **Step 8: Typecheck + lint**

Run: `npm run typecheck && npm run lint`

- [ ] **Step 9: Manual smoke test**

Run: `npm run dev`
- Open an agent detail. Edit it. Save. Confirm the dashboard refreshes (agent shows updated content).
- Open MemoryManager for an agent. Add a memory file. Confirm refresh works.
- Switch projects. Confirm everything re-mounts cleanly (no stale data).

- [ ] **Step 10: Commit**

```bash
git add -u src/ docs/ ; git add src/store/ProjectContext.tsx
git commit -m "refactor(state): add ProjectContext, eliminate 7-level onRefresh drill

ProjectContext exposes { project, projectId, projectName, projectPath,
isUserProject, refresh } to any descendant via useProject(). Drops
project metadata props from MainContent/LandingPage and the long
onRefresh chain through AgentDetail/MemoryManager.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 4 — `useFavoritesStore` (replaces `useFavorites`)

### Task 4.1: Create the store

**Files:**
- Create: `src/store/useFavoritesStore.ts`

- [ ] **Step 1: Create the file**

```ts
// src/store/useFavoritesStore.ts
import { useEffect } from "react";
import { create } from "zustand";

export type FavoriteItem = {
  item_type: "agent" | "skill" | "hook";
  item_name: string;
};

type FavoritesState = {
  byProject: Record<string, FavoriteItem[]>;
  load: (projectId: string) => Promise<void>;
  toggle: (projectId: string, type: FavoriteItem["item_type"], name: string) => Promise<void>;
  isFavorite: (projectId: string, type: FavoriteItem["item_type"], name: string) => boolean;
};

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  byProject: {},

  load: async (projectId) => {
    const data = await window.api.getFavorites(projectId);
    set((s) => ({ byProject: { ...s.byProject, [projectId]: data } }));
  },

  toggle: async (projectId, type, name) => {
    const current = get().byProject[projectId] || [];
    const exists = current.some((f) => f.item_type === type && f.item_name === name);
    if (exists) {
      await window.api.removeFavorite(projectId, type, name);
    } else {
      await window.api.addFavorite(projectId, type, name);
    }
    await get().load(projectId);
  },

  isFavorite: (projectId, type, name) => {
    const list = get().byProject[projectId];
    if (!list) return false;
    return list.some((f) => f.item_type === type && f.item_name === name);
  },
}));

export function useInitFavorites(projectId: string | null) {
  const load = useFavoritesStore((s) => s.load);
  useEffect(() => {
    if (projectId) void load(projectId);
  }, [projectId, load]);
}
```

### Task 4.2: Wire the store and drop drill

**Files:**
- Modify: `src/components/ProjectDashboard/ProjectDashboard.tsx`
- Modify: `src/components/ProjectDashboard/PanelsArea/PanelsArea.tsx`
- Modify: `src/components/ProjectDashboard/MainContent/MainContent.tsx`
- Modify: `src/components/ProjectDashboard/AgentList/AgentList.tsx`
- Modify: `src/components/ProjectDashboard/OrchestratorTree/OrchestratorTree.tsx`
- Modify: `src/components/ProjectDashboard/AgentRow/AgentRow.tsx`
- Modify: `src/components/ProjectDashboard/SkillRow/SkillRow.tsx`
- Modify: `src/components/ProjectDashboard/HookRow/HookRow.tsx`
- Modify: `src/components/AgentDetail/AgentDetail.tsx`
- Modify: `src/components/ProjectDashboard/SkillDetail/SkillDetail.tsx`

- [ ] **Step 1: Initialize favorites in `ProjectDashboard`**

In `src/components/ProjectDashboard/ProjectDashboard.tsx`:

Remove:
```tsx
import { useFavorites } from '@/hooks/useFavorites';
// ...
const { isFavorite, toggle: toggleFavorite } = useFavorites(project.id);
```

Replace with:
```tsx
import { useInitFavorites } from '@/store/useFavoritesStore';
// ...
useInitFavorites(project.id);
```

Remove `isFavorite` and `toggleFavorite` from `<PanelsArea>` and `<MainContent>` JSX.

The local `favAgents`/`favSkills`/`favHooks` filters use `isFavorite("agent", a.id)`. Read these directly from the store instead:
```tsx
import { useFavoritesStore } from '@/store/useFavoritesStore';
// inside component:
const isFav = useFavoritesStore.getState().isFavorite; // for the filter callbacks (non-reactive)
// but for reactivity in the filter results, subscribe:
const favoriteList = useFavoritesStore((s) => s.byProject[project.id] || []);
const favAgents = agents.filter((a) => favoriteList.some((f) => f.item_type === "agent" && f.item_name === a.id));
const favSkills = skills.filter((s) => favoriteList.some((f) => f.item_type === "skill" && f.item_name === s.name));
const favHooks = hooks.filter((h) => favoriteList.some((f) => f.item_type === "hook" && f.item_name === `${h.event}:${h.matcher}`));
const hasFavorites = favAgents.length + favSkills.length + favHooks.length > 0;
```

The `toggleFavorite("agent", agentName)` call inside `handleAgentAction` becomes:
```tsx
case "toggle-favorite":
  void useFavoritesStore.getState().toggle(project.id, "agent", agentName);
  break;
```

- [ ] **Step 2: Drop the favorites props from `PanelsArea`**

Remove `isFavorite`, `toggleFavorite`, `favAgents`, `favSkills`, `favHooks`, `hasFavorites` from `PanelsAreaProps` and destructure.

Inside the component, read everything from the store using `useProject()` for projectId:
```tsx
import { useProject } from '@/store/ProjectContext';
import { useFavoritesStore } from '@/store/useFavoritesStore';
// ...
const { projectId } = useProject();
const favoriteList = useFavoritesStore((s) => s.byProject[projectId] || []);
const isFav = (type: 'agent' | 'skill' | 'hook', name: string) =>
  favoriteList.some((f) => f.item_type === type && f.item_name === name);
const toggleFavorite = (type: 'agent' | 'skill' | 'hook', name: string) =>
  useFavoritesStore.getState().toggle(projectId, type, name);

// Compute the derived sets locally (or pass agents/skills/hooks through useDashboardStore selector):
const agents = useDashboardStore((s) => s.agents);
const skills = useDashboardStore((s) => s.skills);
const hooks = useDashboardStore((s) => s.hooks);
const favAgents = agents.filter((a) => isFav('agent', a.id));
const favSkills = skills.filter((s) => isFav('skill', s.name));
const favHooks = hooks.filter((h) => isFav('hook', `${h.event}:${h.matcher}`));
const hasFavorites = favAgents.length + favSkills.length + favHooks.length > 0;
```

Replace `isFavorite("agent", a.id)` with `isFav('agent', a.id)` in the existing JSX (or just rename the helper to `isFavorite`).

Also drop the related props from `ProjectDashboard.tsx` JSX call to `<PanelsArea>` (everything related to favorites — they're now read from the store).

- [ ] **Step 3: Drop favorites props from `MainContent`**

Remove `isFavorite`, `toggleFavorite` from `MainContentProps` and destructure.

Inside:
```tsx
import { useProject } from '@/store/ProjectContext';
import { useFavoritesStore } from '@/store/useFavoritesStore';
// ...
const { projectId } = useProject();
const favoriteList = useFavoritesStore((s) => s.byProject[projectId] || []);
const isFavorite = (type: 'agent' | 'skill' | 'hook', name: string) =>
  favoriteList.some((f) => f.item_type === type && f.item_name === name);
const toggleFavorite = (type: 'agent' | 'skill' | 'hook', name: string) =>
  useFavoritesStore.getState().toggle(projectId, type, name);
```

Update caller in `ProjectDashboard.tsx` to drop the 2 props.

- [ ] **Step 4: `AgentRow` reads `isFavorite` via selector**

In `src/components/ProjectDashboard/AgentRow/AgentRow.tsx`:

Remove `isAgentFavorite` from props. Inside:
```tsx
import { useProject } from '@/store/ProjectContext';
import { useFavoritesStore } from '@/store/useFavoritesStore';
// ...
const { projectId } = useProject();
const isFavorite = useFavoritesStore((s) =>
  (s.byProject[projectId] || []).some((f) => f.item_type === 'agent' && f.item_name === agent.id)
);
```

Pass `isFavorite={isFavorite}` to `<AgentContextMenu>`.

Update callers (`AgentList`, `OrchestratorTree`) to stop forwarding `isAgentFavorite`.

- [ ] **Step 5: `SkillRow` reads `isFavorite` via selector**

In `src/components/ProjectDashboard/SkillRow/SkillRow.tsx`:

Read the file. Replace the `isFavorite` prop + `onToggleFavorite` callback with selectors + store action.

```tsx
import { useProject } from '@/store/ProjectContext';
import { useFavoritesStore } from '@/store/useFavoritesStore';
// inside component:
const { projectId } = useProject();
const isFavorite = useFavoritesStore((s) =>
  (s.byProject[projectId] || []).some((f) => f.item_type === 'skill' && f.item_name === skill.name)
);
const toggle = () => useFavoritesStore.getState().toggle(projectId, 'skill', skill.name);
```

Remove `isFavorite` and `onToggleFavorite` from props. Update callers in `PanelsArea` to drop those props.

- [ ] **Step 6: `HookRow` same treatment**

Read `HookRow.tsx`. Replace prop-based favorite with store selector keyed by `${hook.event}:${hook.matcher}`. Drop props from callers.

- [ ] **Step 7: `AgentDetail` and `SkillDetail` read favorite via context+store**

In both files: remove `isFavorite`, `onToggleFavorite` from props. Read inside:

```tsx
import { useProject } from '@/store/ProjectContext';
import { useFavoritesStore } from '@/store/useFavoritesStore';
// inside AgentDetail:
const { projectId } = useProject();
const isFavorite = useFavoritesStore((s) =>
  (s.byProject[projectId] || []).some((f) => f.item_type === 'agent' && f.item_name === agent.id)
);
const onToggleFavorite = () => useFavoritesStore.getState().toggle(projectId, 'agent', agent.id);
```

Update the caller `MainContent.tsx` to drop the 2 props for both call sites.

- [ ] **Step 8: Delete `useFavorites.ts`**

Run: `rm src/hooks/useFavorites.ts`
Run: `grep -rn "from '@/hooks/useFavorites'" src/`
Expected: no output.

- [ ] **Step 9: Typecheck + lint**

Run: `npm run typecheck && npm run lint`

- [ ] **Step 10: Manual smoke test**

Run: `npm run dev`
- Toggle a favorite on an agent. Confirm the star indicator updates immediately and the Favorites panel populates.
- Switch project and back. Confirm favorites are per-project.
- Toggle a skill favorite, a hook favorite. Confirm independent.

- [ ] **Step 11: Commit**

```bash
git add -u src/ docs/ ; git add src/store/useFavoritesStore.ts
git commit -m "refactor(state): replace useFavorites with useFavoritesStore

Favorites are per-project in a Zustand store. AgentRow/SkillRow/HookRow
read the favorite flag via selectors keyed by item id, eliminating the
isFavorite/toggleFavorite drill through PanelsArea + MainContent.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 5 — `useDashboardUIStore` (view + selections + panels)

### Task 5.1: Create the UI store

**Files:**
- Create: `src/store/useDashboardUIStore.ts`

- [ ] **Step 1: Create the file**

```ts
// src/store/useDashboardUIStore.ts
import { create } from "zustand";

import type { MainView } from "@/components/ProjectDashboard/types";
import type { SkillFile } from "@/types/dashboard.types";
import type { AgentFile } from "@/types/agent.types";

type ResumeChat = { agentName: string; sessionId: string; message: string } | null;

type DashboardUIState = {
  view: MainView;
  selectedAgent: AgentFile | null;
  selectedSkill: SkillFile | null;
  selectedSessionId: string | null;
  openPanels: Set<string>;
  scopeTab: "project" | "user";
  resumeChat: ResumeChat;

  setView: (view: MainView) => void;
  selectAgent: (a: AgentFile) => void;
  selectSkill: (s: SkillFile) => void;
  selectSession: (id: string) => void;
  togglePanel: (panel: string) => void;
  setScopeTab: (tab: "project" | "user") => void;
  setResumeChat: (r: ResumeChat) => void;
  setSelectedAgent: (a: AgentFile | null) => void;
};

export const useDashboardUIStore = create<DashboardUIState>((set) => ({
  view: "none",
  selectedAgent: null,
  selectedSkill: null,
  selectedSessionId: null,
  openPanels: new Set(),
  scopeTab: "project",
  resumeChat: null,

  setView: (view) => set({ view }),
  selectAgent: (a) => set({ selectedAgent: a, selectedSkill: null, view: "agent" }),
  selectSkill: (s) => set({ selectedSkill: s, selectedAgent: null, view: "skill" }),
  selectSession: (id) => set({ selectedSessionId: id, view: "session" }),
  togglePanel: (panel) =>
    set((s) => {
      const next = new Set(s.openPanels);
      if (next.has(panel)) next.delete(panel);
      else next.add(panel);
      return { openPanels: next };
    }),
  setScopeTab: (tab) => set({ scopeTab: tab }),
  setResumeChat: (resumeChat) => set({ resumeChat }),
  setSelectedAgent: (selectedAgent) => set({ selectedAgent }),
}));
```

### Task 5.2: Move state out of `ProjectDashboard`

**Files:**
- Modify: `src/components/ProjectDashboard/ProjectDashboard.tsx`
- Modify: `src/components/ProjectDashboard/PanelsArea/PanelsArea.tsx`
- Modify: `src/components/ProjectDashboard/MainContent/MainContent.tsx`
- Modify: `src/components/ProjectDashboard/ActiveSessions/ActiveSessions.tsx`

- [ ] **Step 1: Remove all UI useState in `ProjectDashboard`**

Delete:
```tsx
const [view, setView] = useState<MainView>("none");
const [selectedAgent, setSelectedAgent] = useState<AgentFile | null>(null);
const [selectedSkill, setSelectedSkill] = useState<SkillFile | null>(null);
const [openPanels, setOpenPanels] = useState<Set<string>>(() => new Set());
const [scopeTab, setScopeTab] = useState<"project" | "user">("project");
const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
const [resumeChat, setResumeChat] = useState<...>(null);
```

Delete the `togglePanel` helper, `handleSelectAgent`, `handleSelectSkill`, `handleSessionResume`, `handleSelectSession` (most become store actions; the ones that compose multiple actions stay as local helpers if still needed).

Inside the component, read what's still needed locally:
```tsx
import { useDashboardUIStore } from '@/store/useDashboardUIStore';
// ...
const selectedAgent = useDashboardUIStore((s) => s.selectedAgent);
const selectedSkill = useDashboardUIStore((s) => s.selectedSkill);
const setSelectedAgent = useDashboardUIStore((s) => s.setSelectedAgent);
```

The `handleAgentAction` switch — keep as a local closure (it depends on `agents` from the store and the favorite toggle action). Update it to use store actions:
```tsx
case "edit": {
  const agent = agents.find((a) => a.id === agentName);
  if (agent) useDashboardUIStore.getState().selectAgent(agent);
  break;
}
```

For `handleSessionResume` and `handleSelectSession`, keep them as local helpers because they touch chats (Phase 6 will move chats fully into a store). For now:
```tsx
const handleSessionResume = (sessionId: string, message: string) => {
  const session = sessions.find((s) => s.sessionId === sessionId);
  const agentName = session?.agentName || "claude";
  addOpenChat(agentName, `Resume: ${session?.title || agentName}`);
  useDashboardUIStore.getState().setResumeChat({ agentName, sessionId, message });
  useDashboardUIStore.getState().setView("chat");
};

const handleSelectSession = (s: SessionSummary) => {
  addOpenChat(s.agentName || "claude", s.title || s.firstPrompt || "Session");
  useDashboardUIStore.getState().selectSession(s.sessionId);
  selectSession(s.filePath);
};
```

Update JSX calls to `<PanelsArea>`, `<MainContent>`, `<ActiveSessions>`, `<OpenChatsList>` to drop now-redundant props (see following steps).

- [ ] **Step 2: Slim `PanelsArea` to zero props**

In `src/components/ProjectDashboard/PanelsArea/PanelsArea.tsx`:

Remove from `PanelsAreaProps`: `selectedAgent`, `selectedSkill`, `selectedSessionId`, `openPanels`, `scopeTab`, `onTogglePanel`, `onSetScopeTab`, `onSelectAgent`, `onSelectSkill`, `onSelectSession`.

Inside the component, replace with store reads + actions:
```tsx
import { useDashboardUIStore } from '@/store/useDashboardUIStore';
// ...
const selectedAgent = useDashboardUIStore((s) => s.selectedAgent);
const selectedSkill = useDashboardUIStore((s) => s.selectedSkill);
const selectedSessionId = useDashboardUIStore((s) => s.selectedSessionId);
const openPanels = useDashboardUIStore((s) => s.openPanels);
const scopeTab = useDashboardUIStore((s) => s.scopeTab);
const togglePanel = useDashboardUIStore((s) => s.togglePanel);
const setScopeTab = useDashboardUIStore((s) => s.setScopeTab);
const onSelectAgent = useDashboardUIStore((s) => s.selectAgent);
const onSelectSkill = useDashboardUIStore((s) => s.selectSkill);
```

Keep `onAgentAction`, `onToggleLink`, `onSelectSession` as props for now (they're still local closures in `ProjectDashboard`).

`isUserProject`, `sessions`, `sessionsLoading` — still props for now (sessions come from `useSessions` in `ProjectDashboard`).

Update caller in `ProjectDashboard.tsx` to drop the now-removed props.

- [ ] **Step 3: Slim `MainContent`**

Remove from `MainContentProps`: `view`, `selectedAgent`, `selectedSkill`, `resumeChat`, `onSelectAgent`, `onSetView`, `onAgentUpdated`.

Inside, replace:
```tsx
import { useDashboardUIStore } from '@/store/useDashboardUIStore';
// ...
const view = useDashboardUIStore((s) => s.view);
const selectedAgent = useDashboardUIStore((s) => s.selectedAgent);
const selectedSkill = useDashboardUIStore((s) => s.selectedSkill);
const resumeChat = useDashboardUIStore((s) => s.resumeChat);
const setView = useDashboardUIStore((s) => s.setView);
const onSelectAgent = useDashboardUIStore((s) => s.selectAgent);
const onAgentUpdated = useDashboardUIStore((s) => s.setSelectedAgent);
```

The `<AgentTree selectedId={selectedAgent?.id ?? null} onSelect={onSelectAgent} ... />` line uses these store values directly.

Update caller in `ProjectDashboard.tsx`.

- [ ] **Step 4: Slim `ActiveSessions`**

Remove `onSelectAgent` from props. Inside:
```tsx
const selectAgent = useDashboardUIStore((s) => s.selectAgent);
// use selectAgent instead of onSelectAgent
```

Update caller.

- [ ] **Step 5: Typecheck + lint**

Run: `npm run typecheck && npm run lint`

- [ ] **Step 6: Manual smoke test**

Run: `npm run dev`
- Click each accordion (Agents / Skills / Sessions / Hooks). Confirm open/close persists across renders.
- Switch scope tab (Project / User). Confirm.
- Click an agent → opens AgentDetail.
- Click "Tree" / "Sessions" / "Costs" tabs in main pane.
- Click a session → opens SessionViewer.
- Click "Resume" in a session → opens a chat with the resume prefilled.

- [ ] **Step 7: Commit**

```bash
git add -u src/ docs/ ; git add src/store/useDashboardUIStore.ts
git commit -m "refactor(state): add useDashboardUIStore for view + selections + panels

view, selectedAgent, selectedSkill, selectedSessionId, openPanels,
scopeTab, resumeChat move out of ProjectDashboard local state into a
shared store. PanelsArea and MainContent drop the bulk of their props.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 6 — `useChatsStore` (openChats + auto titles)

### Task 6.1: Create the store

**Files:**
- Create: `src/store/useChatsStore.ts`

- [ ] **Step 1: Create the file**

```ts
// src/store/useChatsStore.ts
import { useEffect, useRef } from "react";
import { create } from "zustand";

import type { OpenChat } from "@/components/ProjectDashboard/types";

type ChatsState = {
  openChats: OpenChat[];
  addOpenChat: (agentName: string, title: string) => string;
  updateChatTitle: (id: string, title: string) => void;
  retitleByAgent: (agentName: string, title: string) => void;
  finalizeNewFlag: (id: string) => void;
};

let counter = 0;

export const useChatsStore = create<ChatsState>((set) => ({
  openChats: [],

  addOpenChat: (agentName, title) => {
    const id = `chat-${++counter}-${Date.now()}`;
    set((s) => ({
      openChats: [{ id, agentName, title, createdAt: Date.now(), isNew: true }, ...s.openChats],
    }));
    setTimeout(() => {
      set((s) => ({
        openChats: s.openChats.map((c) => (c.id === id ? { ...c, isNew: false } : c)),
      }));
    }, 600);
    return id;
  },

  updateChatTitle: (id, title) =>
    set((s) => ({
      openChats: s.openChats.map((c) => (c.id === id ? { ...c, title } : c)),
    })),

  retitleByAgent: (agentName, title) =>
    set((s) => ({
      openChats: s.openChats.map((c) =>
        c.agentName === agentName || c.agentName === "claude" ? { ...c, title } : c
      ),
    })),

  finalizeNewFlag: (id) =>
    set((s) => ({
      openChats: s.openChats.map((c) => (c.id === id ? { ...c, isNew: false } : c)),
    })),
}));

export function useInitChatTitles() {
  const pendingTitles = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    const cleanup = window.api.onEvent((raw) => {
      const data = raw as { type: string; agentName?: string; message?: { role: string; content: string } };
      if (data.type !== "spawn_message" || !data.message?.content) return;
      const agent = data.agentName || "";
      const role = data.message.role;
      const content = data.message.content;

      if (role === "user") {
        const { openChats } = useChatsStore.getState();
        const hasGeneric = openChats.some(
          (c) =>
            (c.agentName === agent || c.agentName === "claude") &&
            (c.title === "New chat" || c.title.startsWith("Chat with "))
        );
        if (!hasGeneric || pendingTitles.current.has(agent)) return;

        pendingTitles.current.set(agent, content);
        let preview = content.replace(/[\n\r]+/g, " ").trim();
        if (preview.length > 40) preview = preview.slice(0, 37) + "...";
        useChatsStore.getState().retitleByAgent(agent, preview);
        return;
      }

      if (role === "assistant" && pendingTitles.current.has(agent)) {
        const userMsg = pendingTitles.current.get(agent)!;
        pendingTitles.current.delete(agent);
        void window.api.generateTitle(userMsg, content).then((title) => {
          if (title) useChatsStore.getState().retitleByAgent(agent, title);
        });
      }
    });
    return cleanup;
  }, []);
}
```

### Task 6.2: Wire the store

**Files:**
- Modify: `src/App.tsx` (mount the title init hook at top level so it runs once)
- Modify: `src/components/ProjectDashboard/ProjectDashboard.tsx`
- Modify: `src/components/ProjectDashboard/OpenChatsList/OpenChatsList.tsx`
- Modify: `src/components/ProjectDashboard/MainContent/MainContent.tsx`

- [ ] **Step 1: Initialize title-watcher once in `App.tsx`**

```tsx
import { useInitChatTitles } from "./store/useChatsStore";
// inside App, near useInitEvents():
useInitChatTitles();
```

- [ ] **Step 2: Remove local `openChats` state from `ProjectDashboard`**

Delete:
```tsx
const [openChats, setOpenChats] = useState<OpenChat[]>([]);
const chatIdCounter = useRef(0);
const addOpenChat = useCallback(...);
useAutoChatTitles({ setOpenChats });
```

Replace with:
```tsx
import { useChatsStore } from '@/store/useChatsStore';
// ...
const addOpenChat = useChatsStore((s) => s.addOpenChat);
```

Update `handleSessionResume` and `handleSelectSession` calls — they already call `addOpenChat`, just keep that, now wired through store.

Drop the `<OpenChatsList openChats={openChats} ...>` and `<MainContent onAddOpenChat={addOpenChat} ...>` props.

- [ ] **Step 3: `OpenChatsList` reads from store**

Remove `openChats` from props. Inside:
```tsx
import { useChatsStore } from '@/store/useChatsStore';
const openChats = useChatsStore((s) => s.openChats);
```

- [ ] **Step 4: `MainContent` reads chat actions from store**

Remove `onAddOpenChat`, `onStartChat`, `onSessionResume` from props.

Inside:
```tsx
import { useChatsStore } from '@/store/useChatsStore';
const addOpenChat = useChatsStore((s) => s.addOpenChat);
const setResumeChat = useDashboardUIStore((s) => s.setResumeChat);
const setView = useDashboardUIStore((s) => s.setView);

const onStartChat = (agentName: string, sessionId: string, message: string) => {
  setResumeChat({ agentName, sessionId, message });
};
const onSessionResume = (sessionId: string, message: string) => {
  // sessions still come from a hook in ProjectDashboard; for now, keep this as the
  // simpler "just open chat view with resume" without session lookup
  setResumeChat({ agentName: 'claude', sessionId, message });
  setView('chat');
};
```

Update the caller in `ProjectDashboard.tsx` to drop those 3 props.

`LandingPage` still receives `onAddOpenChat`, `onStartChat`, `onSelectAgent`, `onSelectSession` from MainContent. Update LandingPage to also read these from stores:

In `LandingPage.tsx`: remove `onAddOpenChat`, `onStartChat` props. Inside:
```tsx
import { useChatsStore } from '@/store/useChatsStore';
import { useDashboardUIStore } from '@/store/useDashboardUIStore';
const addOpenChat = useChatsStore((s) => s.addOpenChat);
const setResumeChat = useDashboardUIStore((s) => s.setResumeChat);
const onStartChat = (agentName: string, sessionId: string, message: string) =>
  setResumeChat({ agentName, sessionId, message });
```

- [ ] **Step 5: Delete `useAutoChatTitles.ts`**

Run: `rm src/hooks/useAutoChatTitles.ts`
Run: `grep -rn "useAutoChatTitles" src/` — expected: no output.

- [ ] **Step 6: Typecheck + lint**

Run: `npm run typecheck && npm run lint`

- [ ] **Step 7: Manual smoke test**

Run: `npm run dev`
- Open the global chat modal, send a message. Confirm the chat appears in "Open Chats" sidebar.
- Confirm the title auto-generates after the assistant replies.
- Click "Resume" in a session → confirm the chat opens in main pane with the message prefilled.

- [ ] **Step 8: Commit**

```bash
git add -u src/ docs/ ; git add src/store/useChatsStore.ts
git commit -m "refactor(state): replace useAutoChatTitles with useChatsStore

openChats and auto-title logic move into a Zustand store. ProjectDashboard
no longer owns openChats local state. MainContent and OpenChatsList read
directly from the store.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 7 — Final cleanup

Goal: collapse the derived-data props that were computed in `ProjectDashboard` and forwarded to `PanelsArea`, and remove any now-empty prop interfaces.

**Files:**
- Modify: `src/components/ProjectDashboard/ProjectDashboard.tsx`
- Modify: `src/components/ProjectDashboard/PanelsArea/PanelsArea.tsx`
- Modify: `src/components/ProjectDashboard/MainContent/MainContent.tsx`

### Task 7.1: Move derived data into `PanelsArea`

- [ ] **Step 1: Inline derivations in `PanelsArea`**

Currently `ProjectDashboard` computes `projectAgents`, `userAgents`, `projectSkills`, `userSkills`, `favAgents`, `favSkills`, `favHooks`, `hasFavorites`, `isUserProject` and passes them to `PanelsArea`.

In `PanelsArea.tsx`, compute these from store reads instead:
```tsx
import { useProject } from '@/store/ProjectContext';
import { useDashboardStore } from '@/store/useDashboardStore';
import { useFavoritesStore } from '@/store/useFavoritesStore';

const { project, isUserProject, projectId } = useProject();
const agents = useDashboardStore((s) => s.agents);
const skills = useDashboardStore((s) => s.skills);
const hooks = useDashboardStore((s) => s.hooks);

const projectAgents = agents.filter((a) => a.scope === "project" || (a.scope === "user" && a.linked));
const userAgents = agents.filter((a) => a.scope === "user" && !a.linked);
const projectSkills = skills.filter((s) => s.scope !== "user");
const userSkills = skills.filter((s) => s.scope === "user");

const favoriteList = useFavoritesStore((s) => s.byProject[projectId] || []);
const isFav = (type: 'agent' | 'skill' | 'hook', name: string) =>
  favoriteList.some((f) => f.item_type === type && f.item_name === name);
const favAgents = agents.filter((a) => isFav('agent', a.id));
const favSkills = skills.filter((s) => isFav('skill', s.name));
const favHooks = hooks.filter((h) => isFav('hook', `${h.event}:${h.matcher}`));
const hasFavorites = favAgents.length + favSkills.length + favHooks.length > 0;
```

Remove `projectAgents`, `userAgents`, `projectSkills`, `userSkills`, `favAgents`, `favSkills`, `favHooks`, `hasFavorites`, `isUserProject` from `PanelsAreaProps` (they're all derived locally now).

Remove the equivalent computations from `ProjectDashboard.tsx` (they're no longer needed there).

### Task 7.2: Final type cleanup

- [ ] **Step 1: Audit and shrink prop types**

For each of these files, audit the props type. Any prop that is no longer passed should be removed:

- `PanelsAreaProps` — should now contain only `onAgentAction`, `onToggleLink`, `onSelectSession` (the local closures from ProjectDashboard) and `sessions`, `sessionsLoading` (from `useSessions`).
- `MainContentProps` — should contain only `conversation`, `conversationLoading`, `sessions`, `onSelectSession`, `currentTools` if still there. Anything else read via store/context.
- `ProjectDashboardProps` — should be `Record<string, never>` (or simply remove the type and the component takes no props).

For any prop type that becomes empty, refactor the component to take no props:
```tsx
export function ProjectDashboard() { ... }
```

Update `App.tsx` JSX accordingly:
```tsx
<ProjectDashboard />
```

- [ ] **Step 2: Remove dead imports**

In every file modified during this refactor, remove any imports that are no longer used (TS/ESLint will flag them, but be thorough).

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Both must pass with zero warnings.

- [ ] **Step 4: Final manual smoke test (full sweep)**

Run: `npm run dev`
- Select a project from the home grid.
- Sidebar: open each accordion; switch scope; toggle favorites; click agents/skills/hooks; click a session.
- Main pane: switch between Tree / Sessions / Costs views; open AgentDetail, edit a field, save (refresh works).
- Open MemoryManager from inside AgentDetail; add a memory.
- Open the global chat; send a message; close.
- Click "Resume" on a session; confirm chat opens with prefilled message.
- Trigger any agent that emits IPC events; confirm green dot + context bar appear on AgentRow in sidebar AND in Tree view.
- Switch project; confirm everything re-mounts with fresh data and no stale state from the previous project.

- [ ] **Step 5: Commit**

```bash
git add -u src/ docs/
git commit -m "refactor(state): collapse derived data + final prop cleanup

PanelsArea now derives projectAgents/userAgents/favAgents/etc. locally
from store selectors. ProjectDashboard takes zero props. Removes the
last vestiges of the prop-drilling era.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Self-review notes (post-write)

- **Spec coverage:** every store + context in the spec has a phase. ✓
- **Sessions** explicitly out of scope per the spec — no task for them. ✓
- **`window.api` Context** explicitly deferred — no task. ✓
- **Placeholders:** none. Each step has either exact code or an exact command.
- **Type consistency:** `AgentContext`, `LiveEvent`, `Project`, `SkillFile`, `HookConfig` types are defined in Tasks 1.1 and 2.1, referenced consistently thereafter. `MainView` and `OpenChat` reused from existing `src/components/ProjectDashboard/types.ts`.
- **Ordering risk:** Phase 4 (`ProjectContext`) is now Phase 3 (renumbered in implementation) — favorites store in Phase 4 depends on `useProject()` for `projectId`. Verified: Phase 3 → Phase 4 order respected.
- **Selector identity:** in `PanelsArea` the `favoriteList` selector returns `s.byProject[projectId] || []` — the `|| []` allocates a new array on every call when there are no favorites. To be safe in case of perf issues, can be replaced with a stable empty constant if needed. Documented as a follow-up risk in the spec's Risks section.
