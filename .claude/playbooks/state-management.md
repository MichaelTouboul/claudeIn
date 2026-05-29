---
name: state-management
gate: "Where should this piece of state live?"
triggers:
  - adding a new useState/useReducer
  - lifting state up
  - a value is needed by more than one component
  - a prop is being passed through more than one level
---

# Playbook — State Management

## Decision
For any piece of state being added or moved, decide its home: **props**, **React context**, or **zustand** (`src/store/useAppStore.ts`).

## Criteria (decision tree)
- **Q1 — Does only ONE direct child consume this value?**
  YES → **props** (one hop, parent → direct child).
- **Q2 — Do MULTIPLE components in a SINGLE subtree need it** (they share a common ancestor)?
  YES → **context** at that common ancestor. ALWAYS split into two contexts: one for reactive data, one for stable handlers, so handler-only consumers don't re-render on data change.
- **Q3 — Is it shared across INDEPENDENT subtrees, or truly app-global** (current user, selected project, theme, locale, connection status), or must it survive unmount?
  YES → **zustand** (`useAppStore`, selector-based: `useAppStore((s) => s.x)`).

## When to ASK the user (do NOT auto-decide)
- The value is borderline between Q2 and Q3 (one wide subtree that nearly spans the app).
- It is local UI state (e.g. a modal's `isOpen`) that someone wants in a global store — flag the smell, ask.
- More than one reasonable home exists and the choice affects >3 files.

## Anti-patterns (auto-flag, never produce)
| Smell | Fix |
|---|---|
| Same prop passed through 3+ levels with no intermediate consumer | Move to context |
| Component takes 10–20+ props just to wire one child | Most are subtree-shared → context |
| One giant context with 30+ values | Split into data + actions, or by concern |
| Everything dumped in zustand "because it's easier than props" | Move local UI state back to its owner |
| Component takes a `setX` prop only to forward it | Context or zustand |

## Reference implementation
- Context split pattern + custom `useFoo()` hooks: see `.claude/skills/react-dev/SKILL.md` ("Choosing Where State Lives").
- Store: `src/store/useAppStore.ts`.
