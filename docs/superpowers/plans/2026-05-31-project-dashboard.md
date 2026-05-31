# Per-project Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a two-level per-project dashboard — Level 1 (Project Dashboard with Chat/Context/Task/Plan tabs) and Level 2 (the unchanged Agent Dashboard) — replacing the ad-hoc Tree/Session/Costs header tabs.

**Architecture:** A new reusable `_ui/Tabs` primitive drives a new `ProjectView` container. The existing global `useDashboardUIStore.view` selects the level (`'project'` vs `'agent'`/`'skill'`/`'chat'`); a new `projectTab` selects the Level-1 tab; `activeConversationId` selects which conversation the Chat tab hosts. Dashboard state resets when the selected project changes. Chat + Context tabs are functional (reusing `AgentChat`, `ContextBar`, `CostDashboard`); Task + Plan are static skeletons.

**Tech Stack:** React 19, TypeScript, zustand, Tailwind 4 + CSS custom properties, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-31-project-dashboard-design.md`

**Conventions reminder:** named exports only; `@/` alias; no `any`; 300-line file cap; lint 0 errors/0 warnings; CSS vars via inline `style={{}}` (never hardcoded Tailwind colors); explicit ternaries for conditional render; keys = stable ids; only `_ui/` folders get an `index.ts` barrel.

---

## File Structure

**Create:**
- `src/components/_ui/Tabs/Tabs.tsx` — reusable tab bar primitive (tablist + buttons, CSS-var styling, arrow-key nav).
- `src/components/_ui/Tabs/index.ts` — barrel.
- `src/components/_ui/Tabs/Tabs.test.tsx` — RTL test.
- `src/components/ProjectDashboard/ProjectView/ProjectView.tsx` — Level-1 container (Tabs + active tab body).
- `src/components/ProjectDashboard/ProjectView/ChatTab/ChatTab.tsx` — functional: mounts `AgentChat`.
- `src/components/ProjectDashboard/ProjectView/ContextTab/ContextTab.tsx` — functional: live context list + `CostDashboard`.
- `src/components/ProjectDashboard/ProjectView/TaskTab/TaskTab.tsx` — skeleton placeholder.
- `src/components/ProjectDashboard/ProjectView/PlanTab/PlanTab.tsx` — skeleton placeholder.
- `src/store/useDashboardUIStore.test.ts` — reducer tests.

**Modify:**
- `src/components/ProjectDashboard/types.ts` — add `'project'` to `MainView`; add `ProjectTab`.
- `src/store/useDashboardUIStore.ts` — `view` init `'project'`; add `projectTab`, `activeConversationId`, `setProjectTab`, `setActiveConversation`, `backToProject`.
- `src/components/ProjectDashboard/MainContent/MainContent.tsx` — remove header-tab row + `tree`/`costs` branches + `LandingPage` default; add `project` default branch; keep `session`/`chat`/`agent`/`skill`.
- `src/components/ProjectDashboard/ConversationList/ConversationList.tsx` — clicking a conversation → `setActiveConversation` + land on Chat tab.
- `src/components/ProjectDashboard/ProjectDashboard.tsx` — reset dashboard state on project change.
- `src/components/AgentDetail/AgentDetail.tsx` — add a "‹ Back to project" button.

---

## Task 1: `_ui/Tabs` primitive

**Files:**
- Create: `src/components/_ui/Tabs/Tabs.tsx`
- Create: `src/components/_ui/Tabs/index.ts`
- Test: `src/components/_ui/Tabs/Tabs.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/_ui/Tabs/Tabs.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Tabs } from './Tabs';

const items = [
  { key: 'chat', label: 'Chat' },
  { key: 'context', label: 'Context' },
  { key: 'task', label: 'Task' },
];

describe('Tabs', () => {
  it('renders one tab button per item and marks the active one', () => {
    render(<Tabs tabs={items} active="context" onChange={() => {}} />);
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tab', { name: 'Context' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Chat' })).toHaveAttribute('aria-selected', 'false');
  });

  it('fires onChange with the tab key on click', () => {
    const onChange = vi.fn();
    render(<Tabs tabs={items} active="chat" onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Task' }));
    expect(onChange).toHaveBeenCalledWith('task');
  });

  it('moves selection with ArrowRight/ArrowLeft', () => {
    const onChange = vi.fn();
    render(<Tabs tabs={items} active="chat" onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Chat' }), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('context');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/_ui/Tabs/Tabs.test.tsx`
Expected: FAIL — cannot resolve `./Tabs`.

- [ ] **Step 3: Implement `Tabs.tsx`**

```tsx
// src/components/_ui/Tabs/Tabs.tsx
import { type ReactNode } from 'react';

import { cn } from '@/lib/cn';

export type TabItem = { key: string; label: string; icon?: ReactNode };

export type TabsProps = {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
};

export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  const move = (dir: 1 | -1) => {
    const i = tabs.findIndex((t) => t.key === active);
    if (i === -1) return;
    const next = tabs[(i + dir + tabs.length) % tabs.length];
    onChange(next.key);
  };

  return (
    <div
      role="tablist"
      className={cn('flex items-center gap-1 px-4 py-2', className)}
      style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') { e.preventDefault(); move(1); }
              if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.02em',
              ...(isActive
                ? { background: 'var(--color-surface-3)', color: 'var(--color-text-primary)', boxShadow: '0 0 8px rgba(6, 182, 212, 0.06)' }
                : { color: 'var(--color-text-muted)' }),
            }}
          >
            {tab.icon ?? null}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Create the barrel**

```ts
// src/components/_ui/Tabs/index.ts
export { Tabs, type TabItem, type TabsProps } from './Tabs';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/_ui/Tabs/Tabs.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/_ui/Tabs
git commit -m "feat(ui): add reusable Tabs primitive"
```

---

## Task 2: Store + types (`projectTab`, `activeConversationId`, navigation actions)

**Files:**
- Modify: `src/components/ProjectDashboard/types.ts`
- Modify: `src/store/useDashboardUIStore.ts`
- Test: `src/store/useDashboardUIStore.test.ts`

- [ ] **Step 1: Add types**

In `src/components/ProjectDashboard/types.ts`, change line 1 and add the `ProjectTab` type:

```ts
export type MainView = 'agent' | 'skill' | 'hook' | 'tree' | 'costs' | 'session' | 'chat' | 'project' | 'none';

export type ProjectTab = 'chat' | 'context' | 'task' | 'plan';
```

(Leave `OpenChat` and `SkillTab` unchanged.)

- [ ] **Step 2: Write the failing test**

```ts
// src/store/useDashboardUIStore.test.ts
import { beforeEach, describe, expect, it } from 'vitest';

import type { AgentFile } from '@/types/agent.types';

import { useDashboardUIStore } from './useDashboardUIStore';

const initial = useDashboardUIStore.getState();
beforeEach(() => useDashboardUIStore.setState(initial, true));

const fakeAgent = { id: 'a1' } as AgentFile;

describe('useDashboardUIStore dashboard navigation', () => {
  it('defaults to the project view on the chat tab', () => {
    const s = useDashboardUIStore.getState();
    expect(s.view).toBe('project');
    expect(s.projectTab).toBe('chat');
    expect(s.activeConversationId).toBeNull();
  });

  it('setProjectTab switches the active project tab', () => {
    useDashboardUIStore.getState().setProjectTab('context');
    expect(useDashboardUIStore.getState().projectTab).toBe('context');
  });

  it('setActiveConversation records the conversation id', () => {
    useDashboardUIStore.getState().setActiveConversation('chat-7');
    expect(useDashboardUIStore.getState().activeConversationId).toBe('chat-7');
  });

  it('backToProject returns to the project view and clears the selected agent', () => {
    useDashboardUIStore.getState().selectAgent(fakeAgent);
    expect(useDashboardUIStore.getState().view).toBe('agent');
    useDashboardUIStore.getState().backToProject();
    const s = useDashboardUIStore.getState();
    expect(s.view).toBe('project');
    expect(s.selectedAgent).toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/store/useDashboardUIStore.test.ts`
Expected: FAIL — `projectTab`/`setProjectTab` undefined; `view` is `'none'`.

- [ ] **Step 4: Implement the store changes**

In `src/store/useDashboardUIStore.ts`:

1. Update the import to include `ProjectTab`:

```ts
import type { MainView, ProjectTab } from "@/components/ProjectDashboard/types";
```

2. Add to the `DashboardUIState` type (inside the state block, after `resumeChat`):

```ts
  projectTab: ProjectTab;
  activeConversationId: string | null;
```

and to the actions block:

```ts
  setProjectTab: (tab: ProjectTab) => void;
  setActiveConversation: (id: string | null) => void;
  backToProject: () => void;
```

3. In the `create(...)` initial state, change `view: "none"` → `view: "project"`, and add after `resumeChat: null,`:

```ts
  projectTab: "chat",
  activeConversationId: null,
```

4. Add the new actions (after `setSelectedAgent`):

```ts
  setProjectTab: (projectTab) => set({ projectTab }),
  setActiveConversation: (activeConversationId) => set({ activeConversationId }),
  backToProject: () => set({ view: "project", selectedAgent: null, selectedSkill: null }),
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/store/useDashboardUIStore.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/ProjectDashboard/types.ts src/store/useDashboardUIStore.ts src/store/useDashboardUIStore.test.ts
git commit -m "feat(store): project dashboard view/tab navigation state"
```

---

## Task 3: Skeleton tabs (Task, Plan)

**Files:**
- Create: `src/components/ProjectDashboard/ProjectView/TaskTab/TaskTab.tsx`
- Create: `src/components/ProjectDashboard/ProjectView/PlanTab/PlanTab.tsx`

No tests — pure static placeholders.

- [ ] **Step 1: Create a shared-look skeleton — `TaskTab.tsx`**

```tsx
// src/components/ProjectDashboard/ProjectView/TaskTab/TaskTab.tsx
export function TaskTab() {
  return (
    <div className="flex-1 flex items-center justify-center h-full">
      <div className="text-center">
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)' }}>
          Tasks — coming soon
        </p>
        <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          Jira ticket integration is not built yet.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `PlanTab.tsx`**

```tsx
// src/components/ProjectDashboard/ProjectView/PlanTab/PlanTab.tsx
export function PlanTab() {
  return (
    <div className="flex-1 flex items-center justify-center h-full">
      <div className="text-center">
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)' }}>
          Plans — coming soon
        </p>
        <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          In-app plan tracking is not built yet.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.web.json`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ProjectDashboard/ProjectView/TaskTab src/components/ProjectDashboard/ProjectView/PlanTab
git commit -m "feat(dashboard): Task and Plan skeleton tabs"
```

---

## Task 4: Context tab (functional)

**Files:**
- Create: `src/components/ProjectDashboard/ProjectView/ContextTab/ContextTab.tsx`

Composes the live per-agent context bars (`useEventsStore.agentContexts` + `ContextBar`) above the existing `CostDashboard`. No new backend. No test (pure composition of tested pieces).

- [ ] **Step 1: Create `ContextTab.tsx`**

```tsx
// src/components/ProjectDashboard/ProjectView/ContextTab/ContextTab.tsx
import { ContextBar } from '@/components/ContextBar/ContextBar';
import { CostDashboard } from '@/components/CostDashboard/CostDashboard';
import { useEventsStore } from '@/store/useEventsStore';

export function ContextTab() {
  const agentContexts = useEventsStore((s) => s.agentContexts);
  const rows = Array.from(agentContexts.entries());

  return (
    <div className="flex-1 overflow-y-auto h-full">
      <div className="px-6 pt-5 pb-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-2"
           style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          Live context
        </p>
        {rows.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            No active agents.
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map(([name, ctx]) => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-xs truncate w-40 shrink-0"
                      style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  {name}
                </span>
                <div className="flex-1">
                  <ContextBar percent={ctx.percent} tokensIn={ctx.tokensIn} tokensOut={ctx.tokensOut} costUsd={ctx.costUsd} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <CostDashboard />
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.web.json`
Expected: 0 errors. (If `ContextBar`'s prop names differ, open `src/components/ContextBar/ContextBar.tsx` and match exactly — they are `percent`, `tokensIn`, `tokensOut`, `costUsd`.)

- [ ] **Step 3: Commit**

```bash
git add src/components/ProjectDashboard/ProjectView/ContextTab
git commit -m "feat(dashboard): functional Context tab (live bars + cost analytics)"
```

---

## Task 5: Chat tab (functional)

**Files:**
- Create: `src/components/ProjectDashboard/ProjectView/ChatTab/ChatTab.tsx`

Hosts the active conversation. Default = general project chat (`agentName=""`, which the spawn path maps to `agent_name: undefined`). When `activeConversationId` matches an open chat, mounts that conversation's agent (remounts on switch via React `key`).

- [ ] **Step 1: Create `ChatTab.tsx`**

```tsx
// src/components/ProjectDashboard/ProjectView/ChatTab/ChatTab.tsx
import { AgentChat } from '@/components/AgentChat/AgentChat';
import { useAppStore } from '@/store/useAppStore';
import { useChatsStore } from '@/store/useChatsStore';
import { useDashboardUIStore } from '@/store/useDashboardUIStore';

export function ChatTab() {
  const projectPath = useAppStore((s) => s.selectedProject?.path);
  const activeConversationId = useDashboardUIStore((s) => s.activeConversationId);
  const openChats = useChatsStore((s) => s.openChats);

  if (!projectPath) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
          Select a project to start chatting.
        </p>
      </div>
    );
  }

  const active = openChats.find((c) => c.id === activeConversationId);
  const agentName = active?.agentName ?? '';
  const key = active?.id ?? 'general';

  return (
    <div className="flex-1 min-h-0 h-full p-3">
      <AgentChat key={key} agentName={agentName} />
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.web.json`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ProjectDashboard/ProjectView/ChatTab
git commit -m "feat(dashboard): functional Chat tab hosting the active conversation"
```

---

## Task 6: `ProjectView` container

**Files:**
- Create: `src/components/ProjectDashboard/ProjectView/ProjectView.tsx`

Renders the `Tabs` primitive bound to `projectTab` and the active tab body.

- [ ] **Step 1: Create `ProjectView.tsx`**

```tsx
// src/components/ProjectDashboard/ProjectView/ProjectView.tsx
import { BarChart3, ListTodo, MessageSquare, Map as MapIcon } from 'lucide-react';

import { Tabs, type TabItem } from '@/components/_ui/Tabs';
import { useDashboardUIStore } from '@/store/useDashboardUIStore';

import type { ProjectTab } from '../types';
import { ChatTab } from './ChatTab/ChatTab';
import { ContextTab } from './ContextTab/ContextTab';
import { PlanTab } from './PlanTab/PlanTab';
import { TaskTab } from './TaskTab/TaskTab';

const TABS: TabItem[] = [
  { key: 'chat', label: 'Chat', icon: <MessageSquare size={13} /> },
  { key: 'context', label: 'Context', icon: <BarChart3 size={13} /> },
  { key: 'task', label: 'Task', icon: <ListTodo size={13} /> },
  { key: 'plan', label: 'Plan', icon: <MapIcon size={13} /> },
];

export function ProjectView() {
  const projectTab = useDashboardUIStore((s) => s.projectTab);
  const setProjectTab = useDashboardUIStore((s) => s.setProjectTab);

  return (
    <div className="flex-1 flex flex-col h-full">
      <Tabs tabs={TABS} active={projectTab} onChange={(k) => setProjectTab(k as ProjectTab)} />
      <div className="flex-1 min-h-0 overflow-hidden">
        {projectTab === 'chat' ? <ChatTab /> : null}
        {projectTab === 'context' ? <ContextTab /> : null}
        {projectTab === 'task' ? <TaskTab /> : null}
        {projectTab === 'plan' ? <PlanTab /> : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.web.json`
Expected: 0 errors. (If `lucide-react` lacks a `Map` export under that alias, swap `Map as MapIcon` for `ClipboardList`.)

- [ ] **Step 3: Commit**

```bash
git add src/components/ProjectDashboard/ProjectView/ProjectView.tsx
git commit -m "feat(dashboard): ProjectView container wiring the four tabs"
```

---

## Task 7: Rewire `MainContent` routing

**Files:**
- Modify: `src/components/ProjectDashboard/MainContent/MainContent.tsx`

Remove the header-tab row, the `tree` and `costs` branches, and the `LandingPage` default. Add `view === 'project'` → `<ProjectView />` as the default. Keep `agent`, `skill`, `session`, `chat`.

- [ ] **Step 1: Replace the imports block**

Replace the top imports (lines 1–15) so that `AgentTree`, `CostDashboard`, `LandingPage`, and the three header-tab icons are gone, and `ProjectView` is added:

```tsx
import { AgentChat } from '@/components/AgentChat/AgentChat';
import { AgentDetail } from '@/components/AgentDetail/AgentDetail';
import { SessionViewer } from '@/components/SessionViewer/SessionViewer';
import type { SessionConversation, SessionSummary } from '@/hooks/useSessions';
import { useChatsStore } from '@/store/useChatsStore';
import { useDashboardUIStore } from '@/store/useDashboardUIStore';

import { ProjectView } from '../ProjectView/ProjectView';
import { SkillDetail } from '../SkillDetail/SkillDetail';
```

(Note: `useDashboardStore`/`agents` was only needed by the removed `AgentTree`/`LandingPage`; drop it. `MainView` import was only used by the header-tab array literal — drop it too.)

- [ ] **Step 2: Remove the now-unused store reads**

Inside the component, **delete** these two reads (they fed only the removed `AgentTree`/`LandingPage`):

```tsx
const agents = useDashboardStore((s) => s.agents);              // DELETE
const onSelectAgent = useDashboardUIStore((s) => s.selectAgent); // DELETE
```

**Keep all of these** — they are still used: `view`, `selectedAgent`, `selectedSkill` (skill branch), `resumeChat` + `setResumeChat` + `setView` (the `onSessionResume` helper calls `setView('chat')`), `onAgentUpdated` (= `setSelectedAgent`), `addOpenChat` (used by `onSessionResume`).

- [ ] **Step 3: Drop the now-unused `onSelectSession` prop**

Removing `LandingPage` leaves the `onSelectSession` prop unused. Update `MainContentProps` (lines 17–22) to:

```tsx
export type MainContentProps = {
  conversation: SessionConversation | null;
  conversationLoading: boolean;
  sessions: SessionSummary[];
};
```

and the destructure to `{ conversation, conversationLoading, sessions }`. Then in `src/components/ProjectDashboard/ProjectDashboard.tsx`, remove the `onSelectSession={handleSelectSession}` line from the `<MainContent … />` call (lines 111–116) — leave `handleSelectSession` itself in place (it is still passed to `<PanelsArea>` for History).

- [ ] **Step 4: Replace the returned JSX**

Replace the whole `return (...)` with the header-less version:

```tsx
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 min-h-0 overflow-hidden">
        {view === "agent" && selectedAgent ? (
          <AgentDetail agent={selectedAgent} onDelete={() => {}} onAgentUpdated={onAgentUpdated} />
        ) : view === "skill" && selectedSkill ? (
          <SkillDetail skill={selectedSkill} />
        ) : view === "session" ? (
          <SessionViewer conversation={conversation} loading={conversationLoading} onResume={onSessionResume} />
        ) : view === "chat" && resumeChat ? (
          <AgentChat agentName={resumeChat.agentName} resumeSessionId={resumeChat.sessionId} initialMessage={resumeChat.message} />
        ) : (
          <ProjectView />
        )}
      </div>
    </div>
  );
```

Keep the `onSessionResume` helper (lines 41–47) exactly as-is — it still feeds the `chat` branch.

- [ ] **Step 5: Verify compile + lint (no unused imports/vars)**

Run: `npx tsc --noEmit -p tsconfig.web.json && npm run lint`
Expected: 0 errors, 0 warnings. If lint flags an unused symbol, remove its declaration/import — that's the intended cleanup.

- [ ] **Step 6: Build**

Run: `npx electron-vite build`
Expected: builds with exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/components/ProjectDashboard/MainContent/MainContent.tsx
git commit -m "feat(dashboard): route project view, drop Tree/Costs/Landing from MainContent"
```

---

## Task 8: `ConversationList` → land on the Chat tab

**Files:**
- Modify: `src/components/ProjectDashboard/ConversationList/ConversationList.tsx`

Clicking a conversation should host it in the project Chat tab (Level 1), not jump to the agent editor (Level 2).

- [ ] **Step 1: Swap the store reads**

Replace the `selectAgent` read (line 27) with the new actions:

```tsx
  const setActiveConversation = useDashboardUIStore((s) => s.setActiveConversation);
  const setProjectTab = useDashboardUIStore((s) => s.setProjectTab);
  const setView = useDashboardUIStore((s) => s.setView);
```

- [ ] **Step 2: Change the click handler**

Replace the button `onClick` (line 48):

```tsx
            onClick={() => {
              setActiveConversation(conv.id);
              setProjectTab('chat');
              setView('project');
            }}
```

(The `agent` lookup on line 42 is still used only for the icon color — keep it. If `agent` becomes otherwise unused, the icon color line keeps it referenced, so no lint issue.)

- [ ] **Step 3: Verify compile + lint**

Run: `npx tsc --noEmit -p tsconfig.web.json && npm run lint`
Expected: 0 errors, 0 warnings.

- [ ] **Step 4: Commit**

```bash
git add src/components/ProjectDashboard/ConversationList/ConversationList.tsx
git commit -m "feat(dashboard): clicking a conversation opens it in the Chat tab"
```

---

## Task 9: Reset dashboard state on project change

**Files:**
- Modify: `src/components/ProjectDashboard/ProjectDashboard.tsx`

When the selected project changes, reset to the default Project Dashboard (chat tab, no active conversation, no selected agent).

- [ ] **Step 1: Add the imports**

At the top of `ProjectDashboard.tsx` add:

```tsx
import { useEffect } from 'react';
```

- [ ] **Step 2: Add the reset effect**

Inside `ProjectDashboard`, after the existing hooks (e.g. after the `useResizableSidebar` line), add:

```tsx
  useEffect(() => {
    const ui = useDashboardUIStore.getState();
    ui.setView('project');
    ui.setProjectTab('chat');
    ui.setActiveConversation(null);
    ui.setSelectedAgent(null);
  }, [projectPath]);
```

(`useDashboardUIStore` is already imported in this file.)

- [ ] **Step 3: Verify compile + lint**

Run: `npx tsc --noEmit -p tsconfig.web.json && npm run lint`
Expected: 0 errors, 0 warnings. The effect depends only on `projectPath`; the store getter is read imperatively so it needs no dep — if `react-hooks/exhaustive-deps` warns, it is a genuine false positive here (imperative `getState()` access), but prefer silencing it by keeping the dependency array `[projectPath]` and NOT adding the store (the store reference is stable). If the linter still warns, that is the one place to discuss a config tweak — do not inline-disable.

- [ ] **Step 4: Commit**

```bash
git add src/components/ProjectDashboard/ProjectDashboard.tsx
git commit -m "feat(dashboard): reset dashboard state on project change"
```

---

## Task 10: "Back to project" in the Agent Dashboard

**Files:**
- Modify: `src/components/AgentDetail/AgentDetail.tsx`

Add a small breadcrumb-style button above the agent header that returns to Level 1.

- [ ] **Step 1: Add the import**

At the top of `AgentDetail.tsx`, add:

```tsx
import { ChevronLeft } from 'lucide-react';
import { useDashboardUIStore } from '@/store/useDashboardUIStore';
```

- [ ] **Step 2: Read the action inside the component**

Near the other hooks in `AgentDetail`, add:

```tsx
  const backToProject = useDashboardUIStore((s) => s.backToProject);
```

- [ ] **Step 3: Render the button just inside the outer wrapper, before `<DetailHeader>`**

Immediately after the opening `<div className={`flex-1 flex flex-col h-full ...`}>` (the wrapper returned around line 101) and before `<DetailHeader …/>`, insert:

```tsx
      <button
        onClick={backToProject}
        className="flex items-center gap-1 px-4 pt-2 text-xs transition-colors w-fit"
        style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
      >
        <ChevronLeft size={12} />
        Back to project
      </button>
```

- [ ] **Step 4: Verify compile + lint + line count**

Run: `npx tsc --noEmit -p tsconfig.web.json && npm run lint`
Expected: 0 errors, 0 warnings. Confirm `AgentDetail.tsx` stays ≤ 300 lines (`wc -l src/components/AgentDetail/AgentDetail.tsx`); if the addition pushes it over, extract the new button into a sibling `BackToProjectButton.tsx` in the `AgentDetail/` folder.

- [ ] **Step 5: Commit**

```bash
git add src/components/AgentDetail/AgentDetail.tsx
git commit -m "feat(dashboard): Back-to-project breadcrumb in the agent dashboard"
```

---

## Task 11: Full gate + manual verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full automated gate**

```bash
npx tsc --noEmit -p tsconfig.web.json
npm run lint
npx vitest run
npx electron-vite build
```
Expected: typecheck 0 errors; lint 0 errors / 0 warnings; all tests pass (including the 7 prior test files + the 2 new ones); build exit 0.

- [ ] **Step 2: Manual visual check (`npm run dev`)**

Verify by hand:
- Opening a project shows the **Project Dashboard**, **Chat** tab active, general chat ready.
- Tab bar shows **Chat · Context · Task · Plan**; no Tree/Session/Costs header tabs.
- **Context** tab shows the live-context section (or "No active agents") + the cost charts.
- **Task** and **Plan** tabs show their "coming soon" placeholders.
- Clicking a **conversation** in the Activity sidebar lands in the **Chat** tab with that conversation.
- Clicking an **agent** in the Library sidebar opens the **Agent Dashboard**; the **‹ Back to project** button returns to Level 1.
- Switching projects resets to the Chat tab.

- [ ] **Step 3: Final commit (if any verification fix was needed)**

```bash
git add -A
git commit -m "chore(dashboard): verification fixes"
```

---

## Notes / deviations from spec

- **Session viewing kept:** the spec's "remove Tree and Session" refers to the redundant header tabs. The `session` view branch is **kept** so the Library → History sidebar still opens past sessions (`SessionViewer`). Only the **Tree** view and the header-tab row are removed; **Costs** moves into the Context tab.
- **`LandingPage`** is no longer the default and is dropped from `MainContent`, but the file stays on disk for the separate launch-page-refactor feature request.
- **`AgentDetail` not refactored** to the new `_ui/Tabs` primitive (out of scope — the agent dashboard works as-is); only an additive back button is introduced.
