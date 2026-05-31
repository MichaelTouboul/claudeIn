# Left Sidebar Restructure (Part A) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the left sidebar into two explicit zones — **Activité** (a single `ConversationList`) and **Bibliothèque** (the existing accordion) — and fix the AI-title bug.

**Architecture:** Merge `ActiveSessions` + `OpenChatsList` into one `ConversationList` driven by a pure status-annotation function. `ProjectDashboard` owns the two zone headers. The AI-title bug is fixed by recreating the missing `dialog:generate-title` backend handler (the renderer already calls it).

**Tech Stack:** React 19, TypeScript, zustand, Vitest, Electron (child_process for the title handler).

**Spec:** `docs/superpowers/specs/2026-05-31-sidebar-restructure-design.md`. Vitest is already on `main`. Gate per task: `npm run typecheck` (0), `npm run lint:fix && npm run lint` (0/0), relevant tests, `npx electron-vite build`.

---

## File structure

```
electron/ipc/dialog.ipc.ts                 ← add the dialog:generate-title handler
electron/preload.ts                        ← expose window.api.generateTitle
src/components/ProjectDashboard/
  ConversationList/
    conversations.ts                       ← annotateConversations() pure fn
    conversations.test.ts
    ConversationList.tsx                    ← merged Activité list
  ActiveSessions/                           ← DELETE
  OpenChatsList/                            ← DELETE
  ProjectDashboard.tsx                      ← zone headers + ConversationList
  PanelsArea/PanelsArea.tsx                 ← Favorites top, collapsed by default
```

---

## Task 1: Recreate the AI-title backend handler

The renderer already calls `window.api.generateTitle` (`useChatsStore`) and `src/env.d.ts` already types it, but the backend handler and the preload method were removed. Restore both.

**Files:** Modify `electron/ipc/dialog.ipc.ts`, `electron/preload.ts`

- [ ] **Step 1: Add the handler to `dialog.ipc.ts`**

At the top, ensure this import exists:
```ts
import { exec } from "node:child_process";
```
Inside `registerDialogHandlers()`, add:
```ts
  ipcMain.handle("dialog:generate-title", async (_e, userMessage: string, assistantMessage: string) => {
    const prompt = `Generate a concise title (3-6 words max) for this conversation. Reply ONLY with the title, nothing else — no quotes, no period, no explanation.

User: ${userMessage.slice(0, 200)}
Assistant: ${assistantMessage.slice(0, 200)}`;
    return new Promise<string>((resolve) => {
      const proc = exec("claude --print --max-turns 1", { timeout: 15000, encoding: "utf-8", env: { ...process.env } }, (error, stdout) => {
        if (error || !stdout.trim()) {
          let fallback = userMessage.replace(/[\n\r]+/g, " ").trim();
          if (fallback.length > 50) fallback = fallback.slice(0, 47) + "...";
          resolve(fallback);
        } else {
          resolve(stdout.trim().slice(0, 60));
        }
      });
      proc.stdin?.write(prompt);
      proc.stdin?.end();
    });
  });
```

- [ ] **Step 2: Expose it in `electron/preload.ts`**

Next to `readImageAsDataUrl` (the other `dialog:*` method), add:
```ts
  generateTitle: (userMessage: string, assistantMessage: string) =>
    ipcRenderer.invoke("dialog:generate-title", userMessage, assistantMessage),
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: 0 errors (`src/env.d.ts` already declares `generateTitle`, so the renderer call now matches a real method).

- [ ] **Step 4: Commit**

```bash
git add electron/ipc/dialog.ipc.ts electron/preload.ts
git commit -m "fix(chats): restore dialog:generate-title handler (AI title)"
```

---

## Task 2: annotateConversations (pure status function)

**Files:**
- Create: `src/components/ProjectDashboard/ConversationList/conversations.test.ts`
- Create: `src/components/ProjectDashboard/ConversationList/conversations.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import type { OpenChat } from '../types';
import { annotateConversations } from './conversations';

const chat = (agentName: string): OpenChat => ({ id: agentName, agentName, title: 't', createdAt: 0, isNew: false });

describe('annotateConversations', () => {
  it('marks waiting > live > idle in priority order', () => {
    const chats = [chat('a'), chat('b'), chat('c')];
    const result = annotateConversations(chats, new Set(['a', 'b']), new Set(['b']));
    expect(result.map((c) => c.status)).toEqual(['live', 'waiting', 'idle']);
  });

  it('preserves the chat fields', () => {
    const [only] = annotateConversations([chat('x')], new Set(), new Set());
    expect(only).toMatchObject({ id: 'x', agentName: 'x', status: 'idle' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- conversations`
Expected: FAIL — cannot find `./conversations`.

- [ ] **Step 3: Implement `conversations.ts`**

```ts
import type { OpenChat } from '../types';

export type ConversationStatus = 'live' | 'waiting' | 'idle';
export type AnnotatedConversation = OpenChat & { status: ConversationStatus };

/** Annotate each open chat with a runtime status. waiting > live > idle. */
export function annotateConversations(
  openChats: OpenChat[],
  activeAgents: Set<string>,
  waitingAgents: Set<string>
): AnnotatedConversation[] {
  return openChats.map((chat) => {
    const status: ConversationStatus = waitingAgents.has(chat.agentName)
      ? 'waiting'
      : activeAgents.has(chat.agentName)
        ? 'live'
        : 'idle';
    return { ...chat, status };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- conversations`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ProjectDashboard/ConversationList/conversations.ts src/components/ProjectDashboard/ConversationList/conversations.test.ts
git commit -m "feat(sidebar): conversation status annotation (tested)"
```

---

## Task 3: ConversationList component

**Files:** Create `src/components/ProjectDashboard/ConversationList/ConversationList.tsx`

- [ ] **Step 1: Implement ConversationList** (merges ActiveSessions + OpenChatsList)

```tsx
import { MessageSquare } from 'lucide-react';

import { useChatsStore } from '@/store/useChatsStore';
import { useDashboardStore } from '@/store/useDashboardStore';
import { useDashboardUIStore } from '@/store/useDashboardUIStore';
import { useEventsStore } from '@/store/useEventsStore';

import { annotateConversations, type ConversationStatus } from './conversations';

const colorHex: Record<string, string> = {
  cyan: '#06b6d4', blue: '#3b82f6', green: '#22c55e',
  yellow: '#eab308', orange: '#f97316', red: '#ef4444',
  purple: '#a855f7', pink: '#ec4899',
};

const statusDot: Record<ConversationStatus, { color: string; pulse: boolean }> = {
  live: { color: '#22c55e', pulse: true },
  waiting: { color: '#eab308', pulse: true },
  idle: { color: 'var(--color-text-muted)', pulse: false },
};

export function ConversationList() {
  const openChats = useChatsStore((s) => s.openChats);
  const agents = useDashboardStore((s) => s.agents);
  const activeAgents = useEventsStore((s) => s.activeAgents);
  const waitingAgents = useEventsStore((s) => s.waitingAgents);
  const selectAgent = useDashboardUIStore((s) => s.selectAgent);

  const conversations = annotateConversations(openChats, activeAgents, waitingAgents);

  if (conversations.length === 0) {
    return (
      <p className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
        No active conversations.
      </p>
    );
  }

  return (
    <div className="px-3 pb-2 space-y-0.5">
      {conversations.map((conv) => {
        const agent = agents.find((a) => a.frontmatter.name === conv.agentName || a.id === conv.agentName);
        const dot = statusDot[conv.status];
        const iconColor = colorHex[agent?.frontmatter?.color || ''] || '#06b6d4';
        return (
          <button
            key={conv.id}
            onClick={() => { if (agent) selectAgent(agent); }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left"
            style={{ background: 'transparent', animation: conv.isNew ? 'chatSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)' : undefined }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <MessageSquare size={12} style={{ color: iconColor }} className="shrink-0" />
            <span className="text-xs truncate" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
              {conv.title}
            </span>
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0 ml-auto"
              style={{ backgroundColor: dot.color, animation: dot.pulse ? 'pulse 1s ease-in-out infinite' : undefined }}
              title={conv.status}
            />
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck + lint + build**

Run: `npm run typecheck` → 0. `npm run lint:fix && npm run lint` → 0/0. `npx electron-vite build` → succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/ProjectDashboard/ConversationList/ConversationList.tsx
git commit -m "feat(sidebar): unified ConversationList (Activité zone)"
```

---

## Task 4: Wire into ProjectDashboard + delete old components

**Files:**
- Modify: `src/components/ProjectDashboard/ProjectDashboard.tsx`
- Delete: `src/components/ProjectDashboard/ActiveSessions/`, `src/components/ProjectDashboard/OpenChatsList/`

- [ ] **Step 1: Add a zone-header helper + swap the components in `ProjectDashboard.tsx`**

Replace the imports of `ActiveSessions` and `OpenChatsList` with:
```tsx
import { ConversationList } from './ConversationList/ConversationList';
```
Inside the sidebar `<div>` (the one with `ref={sidebarRef}`), replace `<ActiveSessions />` and `<OpenChatsList />` with a zone header + the list, and add a Bibliothèque header above `<PanelsArea>`:
```tsx
        <ZoneHeader label="Activité" />
        <ConversationList />

        <ZoneHeader label="Bibliothèque" />
        <PanelsArea
          sessions={sessions}
          sessionsLoading={sessionsLoading}
          onAgentAction={handleAgentAction}
          onSelectSession={handleSelectSession}
        />
```
Add this small component at the bottom of the file (or inline above the export):
```tsx
function ZoneHeader({ label }: { label: string }) {
  return (
    <div
      className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest"
      style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
    >
      {label}
    </div>
  );
}
```

- [ ] **Step 2: Delete the absorbed components**

Run:
```bash
git rm -r src/components/ProjectDashboard/ActiveSessions src/components/ProjectDashboard/OpenChatsList
```

- [ ] **Step 3: Verify no dangling references**

Run: `grep -rn "ActiveSessions\|OpenChatsList" src` — expected: no hits.
Run: `npm run typecheck` → 0. `npm run lint:fix && npm run lint` → 0/0. `npx electron-vite build` → succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/ProjectDashboard/ProjectDashboard.tsx
git commit -m "feat(sidebar): Activité/Bibliothèque zones; drop ActiveSessions+OpenChatsList"
```

---

## Task 5: PanelsArea — Favorites on top, Bibliothèque collapsed by default

**Files:** Modify `src/components/ProjectDashboard/PanelsArea/PanelsArea.tsx`

- [ ] **Step 1: Reorder + collapse**

Read `PanelsArea.tsx` first. The accordion items are built as an array (Favorites, Agents, Skills, History, Hooks). Two changes:
1. Ensure the **Favorites** item is the **first** entry in the accordion items array.
2. Make the accordion **default to all sections collapsed**: set the `_ui/Accordion`'s default open value to none (e.g. pass `defaultValue={[]}` / `type="multiple"` with empty default, matching the Accordion primitive's API — check `src/components/_ui/Accordion`). If the Accordion currently force-opens a section, remove that default.

- [ ] **Step 2: Verify gate**

Run: `npm run typecheck` → 0. `npm run lint:fix && npm run lint` → 0/0. `npx electron-vite build` → succeeds.

- [ ] **Step 3: Manual check**

Run `npm run dev`. Confirm: sidebar shows an **Activité** header + the conversation list (status dot + AI title), then a **Bibliothèque** header with the accordion **collapsed**, Favorites first. Open a chat → it appears under Activité; while the agent runs the dot pulses green; when it asks for input it goes yellow.

- [ ] **Step 4: Commit**

```bash
git add src/components/ProjectDashboard/PanelsArea/PanelsArea.tsx
git commit -m "feat(sidebar): Favorites pinned top, Bibliothèque collapsed by default"
```

---

## Follow-ups (Part B + edge cases)

- **Part B** — the animated live agent/sub-agent tree (expand a conversation → its tree), status pulses/transitions (the "Live Agent Activity Visualization" feature request).
- An agent that is **active but has no open chat** (rare; external sessions live in History) is not shown in the Activité list — revisit if it matters.
