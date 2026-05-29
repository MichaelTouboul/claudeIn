---
name: react-dev
description: Canonical reference for project-specific React decisions — where state lives (props vs context vs zustand), context data/actions split, and the reference implementation. Use when the user asks to build, refactor, or debug React code, manage state, or implement components in the Agent Manager app.
---

# React Development Skill

This skill is the canonical reference for project-specific React decisions in the Agent Manager app.
Generic React knowledge (hooks, JSX, lifecycle) is assumed. Project rules override any generic advice.

## When to Use This Skill

- Deciding where to put new state (props / context / zustand)
- Implementing a context data/actions split
- Creating a custom hook that wraps a context
- Debugging re-render issues caused by incorrectly scoped state
- Any question whose answer depends on project conventions rather than generic React docs

## Project Rules (non-negotiable)

- **Named imports only from `'react'`** — JSX transform handles it; the default export is never used. `import { useState, useEffect } from 'react'`.
- **TypeScript types only** — no runtime type-checking libraries (the project uses strict TypeScript).
- **TypeScript files only** — `.tsx` for components, `.ts` for everything else; no JavaScript extensions.
- **300-line hard limit** on every file — enforced by ESLint as an error.
- **No default exports** except `src/App.tsx` and `src/main.tsx`.
- **No `any`** — `@typescript-eslint/no-explicit-any: error`.
- Import via `@/` alias; never `../../../` beyond one level.

---

## Choosing Where State Lives (Source of Truth)

Before adding or moving any state, walk this decision tree:

```
Does only ONE direct child consume this value?
  YES → props (one hop: parent → direct child).

Do MULTIPLE components in a SINGLE subtree need it
(they share a common ancestor that you can own)?
  YES → context at that common ancestor.
         Always split into TWO contexts:
           1. DataContext  — reactive values (causes re-render on change)
           2. ActionsContext — stable handlers (set once; consumers never re-render)

Is it shared across INDEPENDENT subtrees, app-global
(current user, selected project, theme, connection status),
or must it survive unmount?
  YES → zustand (useAppStore, selector-based).
```

**Borderline Q2 vs Q3** — If the subtree nearly spans the whole app, **ask the user** before deciding; do NOT auto-pick.

### Data / Actions Context Split — Reference Implementation

```tsx
// src/contexts/AgentContext.tsx

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Agent } from '@/types';

// ── 1. Shapes ──────────────────────────────────────────────────────────────

interface AgentData {
  agents: Agent[];
  selected: Agent | null;
  isLoading: boolean;
}

interface AgentActions {
  selectAgent: (id: string) => void;
  refreshAgents: () => Promise<void>;
}

// ── 2. Contexts ────────────────────────────────────────────────────────────

const AgentDataContext = createContext<AgentData | null>(null);
const AgentActionsContext = createContext<AgentActions | null>(null);

// ── 3. Provider ────────────────────────────────────────────────────────────

export function AgentProvider({ children }: { children: ReactNode }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selected, setSelected] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const selectAgent = useCallback((id: string) => {
    setSelected(agents.find((a) => a.id === id) ?? null);
  }, [agents]);

  const refreshAgents = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await window.api.agents.list();
      setAgents(list);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Stable actions object — recreated only when callbacks change (never in practice).
  const actions: AgentActions = { selectAgent, refreshAgents };

  return (
    <AgentActionsContext value={actions}>
      <AgentDataContext value={{ agents, selected, isLoading }}>
        {children}
      </AgentDataContext>
    </AgentActionsContext>
  );
}

// ── 4. Custom hooks — never expose raw context ─────────────────────────────

export function useAgentData(): AgentData {
  const ctx = useContext(AgentDataContext);
  if (ctx === null) throw new Error('useAgentData must be used inside AgentProvider');
  return ctx;
}

export function useAgentActions(): AgentActions {
  const ctx = useContext(AgentActionsContext);
  if (ctx === null) throw new Error('useAgentActions must be used inside AgentProvider');
  return ctx;
}
```

**Why two contexts?**
A component that only calls `selectAgent` wraps itself in `AgentActionsContext`. It never re-renders when `agents` or `isLoading` changes, because `ActionsContext.value` is a stable reference (the `useCallback` deps are data, not the actions object itself).

### Anti-Patterns (auto-flag, never produce)

| Smell | Fix |
|---|---|
| Same prop tunnelled through 3+ levels with no intermediate consumer | Move to context |
| Component takes 10–20+ props just to wire one child | Most are subtree-shared → context |
| One giant context with 30+ values | Split data + actions, or by concern |
| Everything dumped in zustand "because it's easier than props" | Move local UI state back to its owner |
| Component takes a `setX` prop only to forward it | Context or zustand |
| `useContext` called directly in a feature component | Always wrap in a named hook (`useFoo`) |

### Quick Reference

| Question | Answer |
|---|---|
| Who owns this value? | The lowest common ancestor that needs to control it |
| Where does it go? | props → context (split) → zustand |
| How do consumers access context? | Only via a named custom hook, never raw `useContext` |
| How to avoid unnecessary re-renders with context? | Split data and actions into two separate contexts |
| How to pick between context and zustand? | Context if subtree-scoped; zustand if app-global or must survive unmount |

---

## zustand — Global Store

`src/store/useAppStore.ts` holds all app-global state. Always consume with a selector to avoid subscribing to the entire store:

```ts
// ✅ selector — only re-renders when selectedProject changes
const project = useAppStore((s) => s.selectedProject);

// ❌ no selector — re-renders on ANY store mutation
const store = useAppStore();
```

Define slice setters inside the `create` call, co-located with the state they mutate. Never expose a setter that lets consumers write arbitrary shape — shape ownership stays in the store.
