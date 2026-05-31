# Workspace Phase 2 — Hamburger utility panel (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Context / Task / Plan out of the dashboard's inner tab bar into a right slide-over panel opened by a hamburger (☰) button, leaving the dashboard body as the Chat surface.

**Architecture:** A new `UtilityPanel` is a right-side slide-over (overlay + panel) that hosts the existing `ContextTab` / `TaskTab` / `PlanTab` behind a small Context/Task/Plan selector. `ProjectView` drops its 4-tab bar: it now renders a slim header (title + ☰ button), the `ChatTab` body, and the `UtilityPanel`. Panel open/selection state is local to `ProjectView` (`useState`) — no store needed. The now-unused `projectTab` store field is removed.

**Tech Stack:** React 19, TypeScript, zustand, Tailwind 4 + CSS custom properties, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-31-tabbed-workspace-design.md` (**Phase 2 of 3**. Phase 1 = external project tabs ✅ done. Phase 3 = dynamic internal conversation/agent/skill tabs.)

**Conventions:** named exports only; `@/` alias; no `any`; 300-line file cap; CSS vars via inline `style={{}}` (never hardcoded Tailwind colors); explicit ternaries; keys = stable ids; zustand selector-based; only `_ui/` folders get an `index.ts` barrel.

---

## File Structure

**Create:**
- `src/components/ProjectDashboard/UtilityPanel/UtilityPanel.tsx` — right slide-over hosting Context/Task/Plan.

**Move (git mv — keep history):**
- `src/components/ProjectDashboard/ProjectView/ContextTab/` → `src/components/ProjectDashboard/UtilityPanel/ContextTab/`
- `src/components/ProjectDashboard/ProjectView/TaskTab/` → `src/components/ProjectDashboard/UtilityPanel/TaskTab/`
- `src/components/ProjectDashboard/ProjectView/PlanTab/` → `src/components/ProjectDashboard/UtilityPanel/PlanTab/`
(These are owned by the utility panel now, not the project view. `ChatTab` stays under `ProjectView/`.)

**Modify:**
- `src/components/ProjectDashboard/ProjectView/ProjectView.tsx` — drop the 4-tab bar; render header + ☰ + `ChatTab` + `UtilityPanel`.
- `src/components/ProjectDashboard/types.ts` — replace `ProjectTab` with `UtilityView`.
- `src/store/useDashboardUIStore.ts` — remove `projectTab` + `setProjectTab` (unused after the rework).
- `src/store/useDashboardUIStore.test.ts` — drop the `projectTab`/`setProjectTab` assertions.

---

## Task 1: Move Context/Task/Plan under `UtilityPanel/` and build the panel

**Files:**
- Move: the three tab folders (see above)
- Create: `src/components/ProjectDashboard/UtilityPanel/UtilityPanel.tsx`
- Modify: `src/components/ProjectDashboard/types.ts`

- [ ] **Step 1: git mv the three tab folders**

```bash
cd src/components/ProjectDashboard
git mv ProjectView/ContextTab UtilityPanel/ContextTab
git mv ProjectView/TaskTab    UtilityPanel/TaskTab
git mv ProjectView/PlanTab    UtilityPanel/PlanTab
```

(The `UtilityPanel/` directory is created by the first `git mv`. The moved files' internal imports use the `@/` alias, so they don't break from the move — verify in Step 4.)

- [ ] **Step 2: Add the `UtilityView` type**

In `src/components/ProjectDashboard/types.ts`, replace the `ProjectTab` line:

```ts
export type UtilityView = 'context' | 'task' | 'plan';
```

(Remove the old `export type ProjectTab = 'chat' | 'context' | 'task' | 'plan';`.)

- [ ] **Step 3: Create `UtilityPanel.tsx`**

```tsx
// src/components/ProjectDashboard/UtilityPanel/UtilityPanel.tsx
import { BarChart3, ListTodo, Map as MapIcon, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Tabs, type TabItem } from '@/components/_ui/Tabs';

import type { UtilityView } from '../types';
import { ContextTab } from './ContextTab/ContextTab';
import { PlanTab } from './PlanTab/PlanTab';
import { TaskTab } from './TaskTab/TaskTab';

const TABS: TabItem[] = [
  { key: 'context', label: 'Context', icon: <BarChart3 size={13} /> },
  { key: 'task', label: 'Task', icon: <ListTodo size={13} /> },
  { key: 'plan', label: 'Plan', icon: <MapIcon size={13} /> },
];

export type UtilityPanelProps = {
  open: boolean;
  onClose: () => void;
};

export function UtilityPanel({ open, onClose }: UtilityPanelProps) {
  const [view, setView] = useState<UtilityView>('context');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-40 flex justify-end">
      <button
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.4)' }}
      />
      <div
        className="relative h-full flex flex-col w-[480px] max-w-[90%]"
        style={{ background: 'var(--color-surface-1)', borderLeft: '1px solid var(--color-border)', boxShadow: '-12px 0 48px rgba(0,0,0,0.4)' }}
      >
        <div className="flex items-center justify-between pr-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <Tabs tabs={TABS} active={view} onChange={(k) => setView(k as UtilityView)} className="flex-1" />
          <button
            onClick={onClose}
            title="Close"
            className="flex items-center justify-center w-7 h-7 rounded-md shrink-0"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={15} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {view === 'context' ? <ContextTab /> : null}
          {view === 'task' ? <TaskTab /> : null}
          {view === 'plan' ? <PlanTab /> : null}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify compile**

Run: `npx tsc --noEmit -p tsconfig.web.json`
Expected: errors only in `ProjectView.tsx` (it still imports the moved tabs + `ProjectTab`) — that's fixed in Task 2. The moved files themselves and `UtilityPanel.tsx` must compile. If a moved file had a relative import that broke, fix it to `@/…`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(dashboard): UtilityPanel slide-over; move Context/Task/Plan under it"
```

---

## Task 2: Rework `ProjectView` (Chat body + hamburger)

**Files:**
- Modify: `src/components/ProjectDashboard/ProjectView/ProjectView.tsx`

- [ ] **Step 1: Replace the whole file**

```tsx
// src/components/ProjectDashboard/ProjectView/ProjectView.tsx
import { Menu } from 'lucide-react';
import { useState } from 'react';

import { ChatTab } from './ChatTab/ChatTab';
import { UtilityPanel } from '../UtilityPanel/UtilityPanel';

export function ProjectView() {
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col h-full relative">
      <div
        className="flex items-center justify-between px-4 py-2 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}
      >
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', letterSpacing: '0.02em' }}
        >
          Chat
        </span>
        <button
          onClick={() => setPanelOpen(true)}
          title="Context · Task · Plan"
          className="flex items-center justify-center w-7 h-7 rounded-md"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Menu size={16} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <ChatTab />
      </div>

      <UtilityPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </div>
  );
}
```

- [ ] **Step 2: Verify compile + lint**

Run: `npx tsc --noEmit -p tsconfig.web.json && npm run lint`
Expected: 0 errors, 0 warnings. (`ProjectView` no longer references `Tabs`, `ProjectTab`, `useDashboardUIStore`, or the moved tabs.)

- [ ] **Step 3: Commit**

```bash
git add src/components/ProjectDashboard/ProjectView/ProjectView.tsx
git commit -m "feat(dashboard): ProjectView shows Chat + hamburger, drops inner tab bar"
```

---

## Task 3: Remove the unused `projectTab` store field

**Files:**
- Modify: `src/store/useDashboardUIStore.ts`
- Modify: `src/store/useDashboardUIStore.test.ts`

`projectTab` / `setProjectTab` are no longer read anywhere (ProjectView stopped using them). Remove them. Keep everything else (`view`, `selectedAgent`, `activeConversationId`, `backToProject`, etc. — still used by `AgentDetail`/`ConversationList`/`MainContent`; Phase 3 cleans those).

- [ ] **Step 1: Edit the store**

In `src/store/useDashboardUIStore.ts`:
- Remove the import usage of `ProjectTab`: change
  `import type { MainView, ProjectTab } from "@/components/ProjectDashboard/types";`
  to `import type { MainView } from "@/components/ProjectDashboard/types";`
- Remove the state field `projectTab: ProjectTab;`
- Remove the action type `setProjectTab: (tab: ProjectTab) => void;`
- Remove the initial value `projectTab: "chat",`
- Remove the action impl `setProjectTab: (projectTab) => set({ projectTab }),`

- [ ] **Step 2: Update the store test**

In `src/store/useDashboardUIStore.test.ts`, delete the test block that asserts `setProjectTab`/`projectTab` (the `it('setProjectTab switches the active project tab', …)` case and any `projectTab` assertion in the defaults test). Keep the `setActiveConversation`, `backToProject`, and default-view tests; in the defaults test, remove only the `expect(s.projectTab).toBe('chat')` line.

- [ ] **Step 3: Run the store test**

Run: `npx vitest run src/store/useDashboardUIStore.test.ts`
Expected: PASS (the remaining cases).

- [ ] **Step 4: Verify compile + lint**

Run: `npx tsc --noEmit -p tsconfig.web.json && npm run lint`
Expected: 0 errors, 0 warnings. (Confirm no other file references `projectTab`/`ProjectTab`: `grep -rn "projectTab\|ProjectTab" src` should return nothing.)

- [ ] **Step 5: Commit**

```bash
git add src/store/useDashboardUIStore.ts src/store/useDashboardUIStore.test.ts
git commit -m "refactor(store): drop unused projectTab field"
```

---

## Task 4: Full gate + manual verification

- [ ] **Step 1: Run the full automated gate**

```bash
npx tsc --noEmit -p tsconfig.web.json
npm run lint
npx vitest run
npx electron-vite build
```
Expected: typecheck 0; lint 0/0; all tests pass; build exit 0.

- [ ] **Step 2: Manual visual check (`npm run dev`)**

- The dashboard body shows the **Chat** with a slim header bearing a **☰** button on the right.
- Clicking **☰** slides in a right panel with **Context / Task / Plan** selectable at its top.
- **Context** shows the live-context section + cost charts; **Task** / **Plan** show "coming soon".
- Closing via the **×**, the backdrop, or **Esc** dismisses the panel; the chat is untouched underneath.
- No more Chat/Context/Task/Plan tab row.

- [ ] **Step 3: Final commit (only if a verification fix was needed)**

```bash
git add -A
git commit -m "chore(dashboard): phase 2 verification fixes"
```

---

## Notes

- **No regression:** Context/Task/Plan stay reachable the whole time (now via ☰), so this phase is a clean working slice.
- **Phase boundary:** the dashboard body is still a single `ChatTab` (general project chat). Dynamic internal tabs (conversations/agents/skills), the `+` menu, sidebar-click rewiring, and the `useDashboardUIStore`/`MainContent` cleanup are **Phase 3** (separate plan).
- **`_ui/Tabs` reuse:** the panel's Context/Task/Plan selector reuses the existing `Tabs` primitive unchanged (the closable variant is a Phase-3 extension).
