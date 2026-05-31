# Workspace Phase 3 — Dynamic internal tabs (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single Chat body with a dynamic strip of internal tabs (chat / agent / skill) per project dashboard, with a `+` menu and closable tabs, and wire the left sidebar to open/activate those tabs.

**Architecture:** Each `Dashboard` in `useWorkspaceStore` gains `tabs: InternalTab[]` + `activeTabId`. `InternalTabBar` renders the active dashboard's tabs (closable, via an extended `_ui/Tabs`) plus a `+` menu (New chat / Open agent) and the hamburger ☰ from Phase 2. `ProjectView` renders the bar + the active tab's body: `chat`→`AgentChat`, `agent`→`AgentDetail`, `skill`→`SkillDetail`. `ProjectDashboard` renders `ProjectView` directly (retiring the old `MainContent` `view` router); sidebar clicks call `addTab`/`setActiveTab` instead of `selectAgent`/`selectSkill`.

**Tech Stack:** React 19, TypeScript, zustand, Tailwind 4 + CSS custom properties, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-31-tabbed-workspace-design.md` (**Phase 3 of 3**. Phase 1 = external project tabs ✅. Phase 2 = hamburger utility panel ✅.)

**Conventions:** named exports only; `@/` alias; no `any`; 300-line file cap; CSS vars via inline `style={{}}` (never hardcoded Tailwind colors); explicit ternaries; keys = stable ids; zustand selector-based; only `_ui/` folders get an `index.ts` barrel. If `simple-import-sort` flags ordering, run `npm run lint:fix`.

**Resume note:** "Resume conversation" from the spec's `+` menu is delivered via the existing **Library → History** sidebar (clicking a past session opens a chat tab for that agent). The `+` menu itself carries **New chat** + **Open agent**. True session-history reload stays the separate "Session Resume" feature request.

**Cleanup note:** dead `useDashboardUIStore` fields and the orphaned `MainContent`/`SessionViewer`/`AgentTree` are intentionally left for a follow-up `dead-code-sweeper` run (keeps this plan's blast radius bounded).

---

## File Structure

**Create:**
- `src/components/ProjectDashboard/InternalTabBar/InternalTabBar.tsx` — the dynamic tab strip + `+` menu + hamburger.
- `src/components/ProjectDashboard/InternalTabBar/AddTabMenu.tsx` — the `+` dropdown (New chat / Open agent).

**Modify:**
- `src/store/useWorkspaceStore.ts` — add `InternalTab`, `tabs`/`activeTabId` per dashboard, `addTab`/`closeTab`/`setActiveTab`; seed a default chat tab in `openDashboard`.
- `src/store/useWorkspaceStore.test.ts` — tests for the tab reducers.
- `src/components/_ui/Tabs/Tabs.tsx` — optional `onClose` per tab (renders `×`).
- `src/components/_ui/Tabs/Tabs.test.tsx` — close test.
- `src/components/ProjectDashboard/ProjectView/ProjectView.tsx` — render `InternalTabBar` + active tab body + `UtilityPanel`.
- `src/components/ProjectDashboard/ProjectView/ChatTab/ChatTab.tsx` — take `agentName`/`tabId` props.
- `src/components/ProjectDashboard/ProjectDashboard.tsx` — render `ProjectView`; rewire `handleSelectSession`; drop unused session-conversation reads.
- `src/components/ProjectDashboard/PanelsArea/PanelsArea.tsx` — agent/skill clicks → `addTab`.
- `src/components/ProjectDashboard/ConversationList/ConversationList.tsx` — reflect the active dashboard's tabs; click → `setActiveTab`.

---

## Task 1: Internal-tab state in `useWorkspaceStore`

**Files:**
- Modify: `src/store/useWorkspaceStore.ts`
- Test: `src/store/useWorkspaceStore.test.ts`

- [ ] **Step 1: Add the failing tests** (append inside the existing `describe`)

```ts
// add at top of file with other imports — none needed beyond existing

  it('a new dashboard starts with one default chat tab', () => {
    useWorkspaceStore.getState().openDashboard(proj('a'));
    const d = useWorkspaceStore.getState().dashboards[0];
    expect(d.tabs).toHaveLength(1);
    expect(d.tabs[0].kind).toBe('chat');
    expect(d.activeTabId).toBe(d.tabs[0].id);
  });

  it('addTab appends a tab to the active dashboard and activates it', () => {
    useWorkspaceStore.getState().openDashboard(proj('a'));
    const id = useWorkspaceStore.getState().addTab({ kind: 'agent', title: 'x', agentName: 'x' });
    const d = useWorkspaceStore.getState().dashboards[0];
    expect(d.tabs).toHaveLength(2);
    expect(d.activeTabId).toBe(id);
  });

  it('addTab dedupes an agent tab by agentName (re-activates)', () => {
    useWorkspaceStore.getState().openDashboard(proj('a'));
    const id1 = useWorkspaceStore.getState().addTab({ kind: 'agent', title: 'x', agentName: 'x' });
    useWorkspaceStore.getState().addTab({ kind: 'chat', title: 'Chat' });
    const id2 = useWorkspaceStore.getState().addTab({ kind: 'agent', title: 'x', agentName: 'x' });
    expect(id2).toBe(id1);
    expect(useWorkspaceStore.getState().dashboards[0].tabs.filter((t) => t.kind === 'agent')).toHaveLength(1);
    expect(useWorkspaceStore.getState().dashboards[0].activeTabId).toBe(id1);
  });

  it('closeTab on the last tab re-seeds a default chat tab', () => {
    useWorkspaceStore.getState().openDashboard(proj('a'));
    const only = useWorkspaceStore.getState().dashboards[0].tabs[0].id;
    useWorkspaceStore.getState().closeTab(only);
    const d = useWorkspaceStore.getState().dashboards[0];
    expect(d.tabs).toHaveLength(1);
    expect(d.tabs[0].kind).toBe('chat');
    expect(d.tabs[0].id).not.toBe(only);
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/store/useWorkspaceStore.test.ts`
Expected: FAIL — `tabs`/`addTab` undefined.

- [ ] **Step 3: Implement the tab state**

Edit `src/store/useWorkspaceStore.ts`:

Add the exported type and a tab counter:

```ts
export type InternalTab = {
  id: string;
  kind: 'chat' | 'agent' | 'skill';
  title: string;
  agentName?: string;
  skillId?: string;
};
```

Extend `Dashboard`:

```ts
export type Dashboard = {
  id: string;
  project: Project;
  tabs: InternalTab[];
  activeTabId: string;
};
```

Add counters + a chat-tab factory near the existing `let counter = 0;`:

```ts
let tabCounter = 0;
const newTabId = () => `tab-${++tabCounter}`;
const defaultChatTab = (): InternalTab => ({ id: newTabId(), kind: 'chat', title: 'Chat' });
```

In the `WorkspaceState` type, add the actions:

```ts
  addTab: (tab: Omit<InternalTab, 'id'>) => string;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
```

In `openDashboard`, when creating a NEW dashboard, seed it with a default chat tab. Replace the new-dashboard block:

```ts
    const id = `dash-${++counter}`;
    const tab = defaultChatTab();
    const dashboards = [...get().dashboards, { id, project, tabs: [tab], activeTabId: tab.id }];
    set({ dashboards, activeDashboardId: id });
    syncSelectedProject(dashboards, id);
    return id;
```

Add a helper to update the active dashboard immutably, above the store:

```ts
function mapActive(
  dashboards: Dashboard[],
  activeId: string | null,
  fn: (d: Dashboard) => Dashboard,
): Dashboard[] {
  return dashboards.map((d) => (d.id === activeId ? fn(d) : d));
}
```

Implement the actions inside `create(...)`:

```ts
  addTab: (tab) => {
    const { dashboards, activeDashboardId } = get();
    const active = dashboards.find((d) => d.id === activeDashboardId);
    if (!active) return '';
    if (tab.kind === 'agent' || tab.kind === 'skill') {
      const key = tab.kind === 'agent' ? 'agentName' : 'skillId';
      const existing = active.tabs.find((t) => t.kind === tab.kind && t[key] === tab[key]);
      if (existing) {
        set({ dashboards: mapActive(dashboards, activeDashboardId, (d) => ({ ...d, activeTabId: existing.id })) });
        return existing.id;
      }
    }
    const id = newTabId();
    set({
      dashboards: mapActive(dashboards, activeDashboardId, (d) => ({
        ...d, tabs: [...d.tabs, { ...tab, id }], activeTabId: id,
      })),
    });
    return id;
  },

  closeTab: (tabId) => {
    const { dashboards, activeDashboardId } = get();
    const active = dashboards.find((d) => d.id === activeDashboardId);
    if (!active) return;
    const idx = active.tabs.findIndex((t) => t.id === tabId);
    if (idx === -1) return;
    let tabs = active.tabs.filter((t) => t.id !== tabId);
    let activeTabId = active.activeTabId;
    if (tabs.length === 0) {
      const seed = defaultChatTab();
      tabs = [seed];
      activeTabId = seed.id;
    } else if (active.activeTabId === tabId) {
      activeTabId = (tabs[idx] ?? tabs[idx - 1]).id;
    }
    set({ dashboards: mapActive(dashboards, activeDashboardId, (d) => ({ ...d, tabs, activeTabId })) });
  },

  setActiveTab: (tabId) => {
    const { dashboards, activeDashboardId } = get();
    set({ dashboards: mapActive(dashboards, activeDashboardId, (d) => ({ ...d, activeTabId: tabId })) });
  },
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/store/useWorkspaceStore.test.ts`
Expected: PASS (Phase-1 cases + the 4 new ones).

- [ ] **Step 5: Commit**

```bash
git add src/store/useWorkspaceStore.ts src/store/useWorkspaceStore.test.ts
git commit -m "feat(workspace): internal tab state (chat/agent/skill) per dashboard"
```

---

## Task 2: Closable `_ui/Tabs`

**Files:**
- Modify: `src/components/_ui/Tabs/Tabs.tsx`
- Test: `src/components/_ui/Tabs/Tabs.test.tsx`

- [ ] **Step 1: Add the failing test** (append to the existing `describe`)

```tsx
  it('renders a close affordance only when onClose is given and fires it', () => {
    const onClose = vi.fn();
    render(<Tabs tabs={[{ key: 'a', label: 'A', onClose }, { key: 'b', label: 'B' }]} active="a" onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close A' }));
    expect(onClose).toHaveBeenCalledWith('a');
    expect(screen.queryByRole('button', { name: 'Close B' })).toBeNull();
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/components/_ui/Tabs/Tabs.test.tsx`
Expected: FAIL — no "Close A" button.

- [ ] **Step 3: Extend the primitive**

In `src/components/_ui/Tabs/Tabs.tsx`:

Add `X` to the import: `import { X } from 'lucide-react';` (at the top with the existing imports).

Extend `TabItem`:

```ts
export type TabItem = { key: string; label: string; icon?: ReactNode; onClose?: (key: string) => void };
```

Inside the tab `<button>`, after `{tab.label}`, append a close affordance. Because a `<button>` cannot nest a `<button>`, render the close as a sibling `<span role="button">`:

```tsx
            {tab.label}
            {tab.onClose ? (
              <span
                role="button"
                aria-label={`Close ${tab.label}`}
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); tab.onClose?.(tab.key); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); tab.onClose?.(tab.key); } }}
                className="ml-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded opacity-50 hover:opacity-100"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <X size={11} />
              </span>
            ) : null}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/components/_ui/Tabs/Tabs.test.tsx`
Expected: PASS (prior 3 + the new one).

- [ ] **Step 5: Commit**

```bash
git add src/components/_ui/Tabs
git commit -m "feat(ui): optional closable tabs in the Tabs primitive"
```

---

## Task 3: `AddTabMenu` (the `+` dropdown)

**Files:**
- Create: `src/components/ProjectDashboard/InternalTabBar/AddTabMenu.tsx`

A `+` button opening a small menu: **New chat** (adds a chat tab) and a list of the repo's agents under **Open agent** (adds an agent tab). Closes on outside-click.

- [ ] **Step 1: Create `AddTabMenu.tsx`**

```tsx
// src/components/ProjectDashboard/InternalTabBar/AddTabMenu.tsx
import { Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useDashboardStore } from '@/store/useDashboardStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

export function AddTabMenu() {
  const agents = useDashboardStore((s) => s.agents);
  const addTab = useWorkspaceStore((s) => s.addTab);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="New tab"
        className="flex items-center justify-center w-7 h-7 rounded-md"
        style={{ color: 'var(--color-text-muted)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <Plus size={15} />
      </button>

      {open ? (
        <div
          className="absolute top-full left-0 mt-1 w-60 rounded-xl z-50 overflow-hidden max-h-80 overflow-y-auto"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', boxShadow: '0 12px 48px rgba(0,0,0,0.5)' }}
        >
          <button
            onClick={() => { addTab({ kind: 'chat', title: 'Chat' }); setOpen(false); }}
            className="w-full text-left px-4 py-2 text-[13px]"
            style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-3)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            + New chat
          </button>
          <div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border-subtle)' }}>
            Open agent
          </div>
          {agents.map((a) => (
            <button
              key={a.id}
              onClick={() => { addTab({ kind: 'agent', title: a.id, agentName: a.id }); setOpen(false); }}
              className="w-full text-left px-4 py-1.5 text-[13px] truncate"
              style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-3)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {a.id}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit -p tsconfig.web.json`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ProjectDashboard/InternalTabBar/AddTabMenu.tsx
git commit -m "feat(dashboard): AddTabMenu (+) for new chat / open agent"
```

---

## Task 4: `InternalTabBar`

**Files:**
- Create: `src/components/ProjectDashboard/InternalTabBar/InternalTabBar.tsx`

Renders the active dashboard's tabs (closable), the `+` menu, and the hamburger ☰ (whose open state is owned by the parent `ProjectView` and passed in).

- [ ] **Step 1: Create `InternalTabBar.tsx`**

```tsx
// src/components/ProjectDashboard/InternalTabBar/InternalTabBar.tsx
import { Menu } from 'lucide-react';

import { Tabs, type TabItem } from '@/components/_ui/Tabs';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

import { AddTabMenu } from './AddTabMenu';

export type InternalTabBarProps = {
  onOpenPanel: () => void;
};

export function InternalTabBar({ onOpenPanel }: InternalTabBarProps) {
  const dashboards = useWorkspaceStore((s) => s.dashboards);
  const activeDashboardId = useWorkspaceStore((s) => s.activeDashboardId);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const closeTab = useWorkspaceStore((s) => s.closeTab);

  const active = dashboards.find((d) => d.id === activeDashboardId);
  if (!active) return null;

  const tabs: TabItem[] = active.tabs.map((t) => ({ key: t.id, label: t.title, onClose: closeTab }));

  return (
    <div
      className="flex items-center justify-between shrink-0"
      style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}
    >
      <div className="flex items-center min-w-0">
        <Tabs tabs={tabs} active={active.activeTabId} onChange={setActiveTab} className="min-w-0 overflow-x-auto" />
        <AddTabMenu />
      </div>
      <button
        onClick={onOpenPanel}
        title="Context · Task · Plan"
        className="flex items-center justify-center w-7 h-7 rounded-md mr-2 shrink-0"
        style={{ color: 'var(--color-text-muted)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <Menu size={16} />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify compile + lint**

Run: `npx tsc --noEmit -p tsconfig.web.json && npm run lint`
Expected: 0 errors, 0 warnings.

- [ ] **Step 3: Commit**

```bash
git add src/components/ProjectDashboard/InternalTabBar/InternalTabBar.tsx
git commit -m "feat(dashboard): InternalTabBar (closable tabs + add menu + hamburger)"
```

---

## Task 5: `ProjectView` renders tab bodies; `ChatTab` takes props

**Files:**
- Modify: `src/components/ProjectDashboard/ProjectView/ChatTab/ChatTab.tsx`
- Modify: `src/components/ProjectDashboard/ProjectView/ProjectView.tsx`

- [ ] **Step 1: Rework `ChatTab` to props**

```tsx
// src/components/ProjectDashboard/ProjectView/ChatTab/ChatTab.tsx
import { AgentChat } from '@/components/AgentChat/AgentChat';
import { useAppStore } from '@/store/useAppStore';

export type ChatTabProps = {
  agentName: string;
  tabId: string;
};

export function ChatTab({ agentName, tabId }: ChatTabProps) {
  const projectPath = useAppStore((s) => s.selectedProject?.path);

  if (!projectPath) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
          Select a project to start chatting.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 h-full p-3">
      <AgentChat key={tabId} agentName={agentName} />
    </div>
  );
}
```

- [ ] **Step 2: Rework `ProjectView`**

```tsx
// src/components/ProjectDashboard/ProjectView/ProjectView.tsx
import { useState } from 'react';

import { AgentDetail } from '@/components/AgentDetail/AgentDetail';
import { useDashboardStore } from '@/store/useDashboardStore';
import { useDashboardUIStore } from '@/store/useDashboardUIStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

import { InternalTabBar } from '../InternalTabBar/InternalTabBar';
import { SkillDetail } from '../SkillDetail/SkillDetail';
import { UtilityPanel } from '../UtilityPanel/UtilityPanel';
import { ChatTab } from './ChatTab/ChatTab';

export function ProjectView() {
  const [panelOpen, setPanelOpen] = useState(false);
  const dashboards = useWorkspaceStore((s) => s.dashboards);
  const activeDashboardId = useWorkspaceStore((s) => s.activeDashboardId);
  const agents = useDashboardStore((s) => s.agents);
  const skills = useDashboardStore((s) => s.skills);
  const onAgentUpdated = useDashboardUIStore((s) => s.setSelectedAgent);

  const active = dashboards.find((d) => d.id === activeDashboardId);
  const tab = active?.tabs.find((t) => t.id === active.activeTabId) ?? null;

  return (
    <div className="flex-1 flex flex-col h-full relative">
      <InternalTabBar onOpenPanel={() => setPanelOpen(true)} />

      <div className="flex-1 min-h-0 overflow-hidden">
        {tab && tab.kind === 'chat' ? <ChatTab tabId={tab.id} agentName={tab.agentName ?? ''} /> : null}
        {tab && tab.kind === 'agent' ? (() => {
          const agent = agents.find((a) => a.id === tab.agentName);
          return agent ? <AgentDetail agent={agent} onDelete={() => {}} onAgentUpdated={onAgentUpdated} /> : (
            <div className="flex-1 flex items-center justify-center h-full">
              <p className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>Agent not found in this project.</p>
            </div>
          );
        })() : null}
        {tab && tab.kind === 'skill' ? (() => {
          const skill = skills.find((s) => s.filePath === tab.skillId);
          return skill ? <SkillDetail skill={skill} /> : (
            <div className="flex-1 flex items-center justify-center h-full">
              <p className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>Skill not found in this project.</p>
            </div>
          );
        })() : null}
      </div>

      <UtilityPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </div>
  );
}
```

- [ ] **Step 3: Verify compile + lint**

Run: `npx tsc --noEmit -p tsconfig.web.json && npm run lint`
Expected: 0 errors, 0 warnings.

- [ ] **Step 4: Commit**

```bash
git add src/components/ProjectDashboard/ProjectView
git commit -m "feat(dashboard): ProjectView renders internal tab bodies (chat/agent/skill)"
```

---

## Task 6: Render `ProjectView` in `ProjectDashboard` + rewire sidebar

**Files:**
- Modify: `src/components/ProjectDashboard/ProjectDashboard.tsx`
- Modify: `src/components/ProjectDashboard/PanelsArea/PanelsArea.tsx`
- Modify: `src/components/ProjectDashboard/ConversationList/ConversationList.tsx`

- [ ] **Step 1: `ProjectDashboard` renders `ProjectView` directly**

In `src/components/ProjectDashboard/ProjectDashboard.tsx`:
- Replace the import `import { MainContent } from './MainContent/MainContent';` with `import { ProjectView } from './ProjectView/ProjectView';`.
- Replace the `<MainContent … />` JSX block with `<ProjectView />`.
- Rewire `handleSelectSession` (History click) to open a chat tab for that session's agent:

```tsx
  const handleSelectSession = (s: SessionSummary) => {
    useWorkspaceStore.getState().addTab({ kind: 'chat', title: s.title || s.firstPrompt || 'Session', agentName: s.agentName || '' });
  };
```

- Add `import { useWorkspaceStore } from '@/store/useWorkspaceStore';` if not present.
- Remove now-unused reads: the `conversation`, `conversationLoading` from the `useSessions(...)` destructure (keep `sessions`, `selectSession` is no longer needed — drop it too if unused), and the `addOpenChat` read if it is now unused. Run lint to confirm what's unused and remove exactly those.

- [ ] **Step 2: `PanelsArea` agent/skill clicks → `addTab`**

In `src/components/ProjectDashboard/PanelsArea/PanelsArea.tsx`, replace the two handlers (lines ~45–46):

```tsx
  const addTab = useWorkspaceStore((s) => s.addTab);
  const onSelectAgent = (a: AgentFile) => addTab({ kind: 'agent', title: a.id, agentName: a.id });
  const onSelectSkill = (s: SkillFile) => addTab({ kind: 'skill', title: s.name, skillId: s.filePath });
```

Add the imports at the top: `import { useWorkspaceStore } from '@/store/useWorkspaceStore';`, `import type { AgentFile } from '@/types/agent.types';`, `import type { SkillFile } from '@/types/dashboard.types';` (if not already imported). The `selectedAgent`/`selectedSkill` reads used for row highlighting may now be stale — leave them (highlighting is non-critical); if lint flags them as unused after the change, remove those reads and pass `selectedId={null}`/`selected={false}`.

- [ ] **Step 3: `ConversationList` reflects the active dashboard's tabs**

Replace the body of `src/components/ProjectDashboard/ConversationList/ConversationList.tsx` so it lists the active dashboard's chat/agent tabs and activates them on click:

```tsx
import { MessageSquare } from 'lucide-react';

import { useDashboardStore } from '@/store/useDashboardStore';
import { useEventsStore } from '@/store/useEventsStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

const colorHex: Record<string, string> = {
  cyan: '#06b6d4', blue: '#3b82f6', green: '#22c55e',
  yellow: '#eab308', orange: '#f97316', red: '#ef4444',
  purple: '#a855f7', pink: '#ec4899',
};

export function ConversationList() {
  const dashboards = useWorkspaceStore((s) => s.dashboards);
  const activeDashboardId = useWorkspaceStore((s) => s.activeDashboardId);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const agents = useDashboardStore((s) => s.agents);
  const activeAgents = useEventsStore((s) => s.activeAgents);
  const waitingAgents = useEventsStore((s) => s.waitingAgents);

  const active = dashboards.find((d) => d.id === activeDashboardId);
  const tabs = active?.tabs.filter((t) => t.kind === 'chat' || t.kind === 'agent') ?? [];

  if (tabs.length === 0) {
    return (
      <p className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
        No active conversations.
      </p>
    );
  }

  return (
    <div className="px-3 pb-2 space-y-0.5">
      {tabs.map((tab) => {
        const name = tab.agentName ?? '';
        const agent = agents.find((a) => a.id === name);
        const status = waitingAgents.has(name) ? 'waiting' : activeAgents.has(name) ? 'live' : 'idle';
        const dotColor = status === 'live' ? '#22c55e' : status === 'waiting' ? '#eab308' : 'var(--color-text-muted)';
        const iconColor = colorHex[agent?.frontmatter?.color || ''] || '#06b6d4';
        const isActive = tab.id === active?.activeTabId;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left"
            style={{ background: isActive ? 'var(--color-surface-2)' : 'transparent' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = isActive ? 'var(--color-surface-2)' : 'transparent')}
          >
            <MessageSquare size={12} style={{ color: iconColor }} className="shrink-0" />
            <span className="text-xs truncate" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
              {tab.title}
            </span>
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0 ml-auto"
              style={{ backgroundColor: dotColor, animation: status !== 'idle' ? 'pulse 1s ease-in-out infinite' : undefined }}
              title={status}
            />
          </button>
        );
      })}
    </div>
  );
}
```

(The old `./conversations` helper is no longer imported here; leave the file on disk — the dead-code-sweeper handles it later.)

- [ ] **Step 4: Verify compile + lint + build**

Run: `npx tsc --noEmit -p tsconfig.web.json && npm run lint && npx electron-vite build`
Expected: 0 errors, 0 warnings, build exit 0. Remove any symbol lint flags as unused (leftover `useDashboardUIStore`/`useChatsStore` reads in the touched files).

- [ ] **Step 5: Commit**

```bash
git add src/components/ProjectDashboard
git commit -m "feat(dashboard): render ProjectView, wire sidebar clicks to internal tabs"
```

---

## Task 7: Full gate + manual verification

- [ ] **Step 1: Full automated gate**

```bash
npx tsc --noEmit -p tsconfig.web.json
npm run lint
npx vitest run
npx electron-vite build
```
Expected: typecheck 0; lint 0/0; all tests pass (incl. new workspace + Tabs cases); build exit 0.

- [ ] **Step 2: Manual visual check (`npm run dev`)**

- A fresh project tab opens with one **Chat** internal tab.
- The internal `+` menu offers **New chat** and the repo's **agents**; picking one opens a new tab.
- Clicking an **agent** in the Library opens it as a tab (the agent dashboard); a **skill** opens as a tab (skill detail); re-clicking re-activates instead of duplicating.
- Tabs are **closable** (`×`); closing the last one re-seeds a Chat tab.
- The **Activity** sidebar lists the active dashboard's open conversation/agent tabs with a status dot; clicking activates the tab.
- The **☰** still opens the Context/Task/Plan slide-over.
- Switching **external project tabs** swaps the whole set of internal tabs + sidebar.

- [ ] **Step 3: Final commit (only if a verification fix was needed)**

```bash
git add -A
git commit -m "chore(dashboard): phase 3 verification fixes"
```

---

## Notes

- **Dead code left for the sweeper:** `MainContent`, `SessionViewer`, `AgentTree`, the `conversations.ts` helper, and unused `useDashboardUIStore` fields (`view`, `selectedAgent`, `selectedSkill`, `activeConversationId`, `backToProject`, `selectAgent`, `selectSkill`, `selectSession`, `setActiveConversation`, …) become unreferenced after this phase. Do NOT remove them here — run the `dead-code-sweeper` agent afterward so removals are isolated and gate-verified separately.
- **Resume:** opening a past session from History creates a fresh chat tab for that agent (not a full session reload — that's the separate Session Resume feature request).
- **Highlighting:** agent/skill row "selected" styling in the Library may not track the active tab precisely this phase; it's cosmetic and can be tightened later.
