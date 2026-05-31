# Design — Left sidebar restructure (Part A: information architecture)

**Date:** 2026-05-31
**Status:** Approved (brainstorming) — pending implementation plan
**Pillar:** Visualize the ecosystem (Pillar #2) — `docs/roadmap.md`

## Problem

The left sidebar is conceptually unclear. It already stacks activity components
(`ActiveSessions`, `OpenChatsList`) above a definitions accordion (`PanelsArea`:
Agents/Skills/Hooks/History), but:
- there is **no visual boundary** between "what's running" and "the catalog";
- **conversations are scattered across three surfaces** (ActiveSessions = live
  agents, OpenChatsList = open chats, History = past sessions);
- the **agent / orchestrator / sub-agent vocabulary is tangled**;
- a **bug**: the conversation title shows the first prompt, not the AI title.

## Core framing (decided)

Two axes, made explicit in the UI:
- **Activité** (runtime) — what is running / open now.
- **Définitions / Bibliothèque** (static) — the catalog of agents, skills, hooks.

"Orchestrator" and "sub-agent" are **not agent types** — they are a **runtime
relation** (who delegates to whom). The library shows an agent; its declared
sub-agents appear as a tree **when that agent is selected**, not as a separate
category.

## Scope

**Part A only — the IA restructure.** The rich, animated *live agent activity
visualization* (the `docs/feature-requests.md` "Live Agent Activity
Visualization") is **Part B, a separate later spec**. Part A uses the existing
display (status badge + title); it does not build the animated agent tree.

## Decisions (from brainstorming)

- **Two explicit zones** with headers: `Activité` then `Bibliothèque`.
- **One unified `ConversationList`** in the Activité zone: merges `ActiveSessions`
  + `OpenChatsList`. One row per conversation with a **status badge** (● live /
  ◐ waiting / ○ idle) and the **AI title**. `ActiveSessions` and `OpenChatsList`
  are absorbed and deleted.
- **Bibliothèque** = the existing accordion, kept, collapsed by default:
  **★ Favorites pinned at top**, then `Agents` (Project / User by scope), `Skills`,
  `Hooks`, `History` (past sessions).
- **Include the AI-title bug fix** here (the Conversation list shows the AI title):
  recreate the missing backend handler `dialog:generate-title`.

## Target structure

```
▸ ACTIVITÉ
   ConversationList            ● agent-x · "AI title"   live
                               ◐ agent-y · "AI title"   waiting
                               ○ agent-z · "AI title"   idle
▸ BIBLIOTHÈQUE  (accordion, collapsed by default)
   ★ Favorites
   Agents  (Project / User by scope)
   Skills
   Hooks
   History
```

## Components & changes

- **NEW `src/components/ProjectDashboard/ConversationList/ConversationList.tsx`** —
  merges the logic of `ActiveSessions` + `OpenChatsList`. A row per open chat
  (`useChatsStore.openChats`) annotated with status derived from
  `useEventsStore` (`activeAgents` / `waitingAgents`). Click → opens the
  conversation in `MainContent`. Shows the AI title.
- **DELETE** `ActiveSessions/` and `OpenChatsList/` (absorbed).
- **`PanelsArea.tsx`** — add the two zone headers; the accordion becomes the
  Bibliothèque body; move Favorites to the top; keep `Agents`/`Skills`/`Hooks`/
  `History` as accordion sections; default the Bibliothèque collapsed.
- **`ProjectDashboard.tsx`** — render `<ConversationList>` under the `Activité`
  header, `<PanelsArea>` (Bibliothèque) below; remove the now-deleted imports.
- **AI-title fix (cross-cutting)** — recreate the `dialog:generate-title` IPC
  handler in `electron/ipc/dialog.ipc.ts` (runs `claude --print --max-turns 1`
  with a "generate a 3–6 word title" prompt, returns the trimmed title). The
  frontend already calls `window.api.generateTitle` in `useChatsStore`; it only
  lacks the backend. Add the preload method + `env.d.ts` type if missing.

## Data flow

- **Status derivation** is a pure function: `annotateConversations(openChats,
  activeAgents, waitingAgents) → (chat & { status: 'live'|'waiting'|'idle' })[]`.
  Live if the chat's agent is in `activeAgents`; waiting if in `waitingAgents`;
  else idle.
- **Title**: `useChatsStore` already sets a first-prompt preview then calls
  `generateTitle` to replace it with the AI title — restoring the backend handler
  makes the AI title arrive.

## Error handling

- `generate-title`: if `claude --print` errors or returns empty, keep the
  first-prompt preview (the existing fallback in `useChatsStore`); never block.
- Empty Activité zone (no conversations) → a quiet "No active conversations"
  line, not an empty void.

## Testing

- TDD the pure `annotateConversations` function (Vitest): given chats + active/
  waiting sets → correct status per row.
- Layout / accordion / zone headers: typecheck + lint + `electron-vite build` +
  manual visual check.
- `generate-title` handler: light backend check or manual.

## Non-goals (Part B and beyond)

- The animated live agent/sub-agent tree, expand-a-conversation-to-its-tree,
  status pulses/transitions (the "Live Agent Activity Visualization" feature
  request).
- Any change to `MainContent`, the agent editor, or skills/hooks internals.
