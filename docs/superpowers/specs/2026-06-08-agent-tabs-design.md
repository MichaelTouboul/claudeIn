# Agent tabs on the chat input — design spec

**Date:** 2026-06-08
**Status:** approved (brainstorm), pending plan
**Topic:** replace the "ugly" live-agent display in the left sidebar with a row of **agent tabs on the chat input bar**; each sub-agent invoked in the conversation appears as a tab (pulsing colored dot when active, static when idle, `×` to dismiss). Clicking a tab opens that agent's live activity in the **right panel** (`UtilityPanel`) as a new `agent` tab.

## 1. Goal

Make active agents and their activity legible without the cluttered left-sidebar tree. Presence lives on the chat input (where the work is happening); detail lives in the right panel (the extensible surface built in the response-panel feature). The left sidebar stops showing live agent activity.

## 2. Key decisions (from brainstorm)

| Decision | Choice |
|---|---|
| Which agents | **Sub-agents invoked in THIS conversation**, scoped by `session_id` (from `LiveEvent`). Not the project's defined-agent tree; not global. |
| Orchestrator | **No tab** — the main/orchestrator agent *is* the conversation (its activity is the chat). Sub-agents only. |
| Where tabs live | A row on the **chat input bar** (`AgentChatInput`), above the editor. Per-conversation. |
| Dot | Pulsing colored dot when **active** (`activeAgents`, 5 s window); static colored dot when **idle**; `waiting` state distinct. Color = the agent's `frontmatter.color` if its runtime name matches a defined project agent, else a deterministic palette hash of the name. |
| `×` | **Cosmetic dismiss**; the agent's tab reappears if a **newer event** arrives after the dismissal (non-destructive — never stops the agent). |
| Click | Opens (or focuses) an `agent` tab in the **right panel** (`UtilityPanel`). |
| Agent activity view (right panel) | Header (status + current tool + `ContextBar`) **+** live event stream filtered to the agent **+** the agent's last response/result. |
| Left sidebar cleanup | Remove **only** `OrchestratorTree` (the live tree). Keep `AgentList` (browsable defined agents — Pillar 2) and `SessionsPanel`. |

## 3. Architecture (reuses existing infra)

```
AgentChatInput (per conversation)
  ┌ AgentTabs:  [● research][◌ writer][● db-agent] … ┐
  └ RichEditor (text)                                 ┘
        │ click a tab
        ▼
  UtilityPanel (right) → PanelTab kind:'agent'
  ┌ header: ● status + currentTool + ContextBar ┐
  │ live event stream (filtered to the agent)    │
  │ last response / result                       │
  └──────────────────────────────────────────────┘
```

**Approach:** *derive from existing events* (vs a dedicated presence store or a backend IPC) — least new state, reuses the response-panel tab infra and `useEventsStore`.

- **`useConversationAgents(claudeSessionId)`** — selector over `useEventsStore`: distinct `agent_name`s whose events carry this `session_id`, each mapped to `{ name, color, status }` (status from `activeAgents`/`waitingAgents`), minus dismissed-and-not-since-re-emitted.
- **`AgentTabs`** (`AgentChat/AgentChatInput/AgentTabs/`) — the row; dot (enum + behavior map for `active|waiting|idle`), color resolution, `×`. Clicking calls `usePanelStore.openTab({ kind: 'agent', … })`.
- **`PanelTabKind.Agent`** added to `usePanelStore`; **`AgentTab`** body in `UtilityPanel/AgentTab/` — reuses `ContextBar`, `currentTools`, and an event-stream view extracted from `EventConsole`.
- **Dismiss** — a per-conversation `Map<agentName, seq>` (last event `id` at dismissal time); an agent shows when its max event `id` for the session exceeds its dismissed seq. Lives in a small store (or `useEventsStore` slice) keyed by session.
- **Remove** `OrchestratorTree` from `PanelsArea` (left sidebar).

### ⚠️ Feasibility cornerstone (validate first)

`LiveEvent` carries `session_id`, and `events.service.ts` persists it. **Unverified:** that sub-agent events carry the *parent conversation's* `session_id` (vs their own). Phase 1 must verify this linkage; if absent, add a small backend task to tag sub-agent events with the conversation session before building on the scoping.

## 4. Delivery phases (test + commit between each)

1. **Data + presence.** `useConversationAgents` (session-scoped) + `AgentTabs` on the input bar (dot color + active pulse + name, no click yet). **Validates the `session_id` ↔ sub-agent linkage** (cornerstone; +backend task if missing).
2. **Right-panel agent view.** `PanelTabKind.Agent` + `AgentTab` (header status/tool/`ContextBar` + filtered event stream + last response); click a tab → open/focus the agent tab.
3. **Dismiss + cleanup.** `×` (seq-based reappear) + remove `OrchestratorTree` from the left sidebar.

## 5. Out of scope (YAGNI)

Stopping/killing agents from the tab, per-agent history across conversations, reordering tabs, the orchestrator as a tab, multi-conversation aggregation.

## 6. Conventions

Follows `CLAUDE.md` / `src/CLAUDE.md`: no `any`, named imports, 300-line limit, design-system CSS vars, enum+behavior-map for the agent status, zustand selector-based for shared state. Reuses `ContextBar`, `EventConsole` logic, the response-panel `usePanelStore`/`UtilityPanel` infra.
