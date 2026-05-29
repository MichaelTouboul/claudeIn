---
name: component-placement
gate: "Where does this component live, and does a file need splitting?"
triggers:
  - creating a new component
  - a child component starts being used by a second parent
  - a file approaches or exceeds 300 lines
---

# Playbook — Component Placement & File Splitting

## Decision
Two linked decisions: (a) which folder a component belongs in, and (b) when/how to split a file that grows too large.

## Criteria — placement (decision tree)
- **Used by exactly ONE parent?** → nest it INSIDE that parent's folder (`AgentChat/AgentChatHeader/`). Parent–child = folder nesting.
- **Used independently by the app (not owned by one parent)?** → sibling folder at the same level under `src/components/`.
- **Now used by MORE THAN ONE parent? → promote:**
  - generic, reusable, no domain knowledge → `src/components/_ui/` (add an `index.ts` barrel — `_ui/` only).
  - otherwise → `src/components/` root, as a sibling of its former parents.
- **Max nesting: 2 levels.** Deeper → split or promote.
- Folder name = component name in **PascalCase**. A `.css` file ONLY if the component has its own styles (never an empty one).

## Criteria — file splitting (hard rule: no file > 300 lines)
When a file nears 300 lines, split, in this order of preference:
1. Extract sub-components into their own folders under `src/components/`.
2. Extract custom hooks into `src/hooks/`.
3. Extract pure helpers into a sibling file (e.g. `AgentChat/utils.ts`).
4. Extract local types into a sibling file (e.g. `AgentChat/types.ts`).

## When to ASK the user (do NOT auto-decide)
- Promotion target is ambiguous: is the component a generic `_ui/` primitive or a domain sibling?
- A split would change the public surface of a widely-imported component.
- The natural split crosses the frontend/backend boundary.

## Out of scope
- Do NOT restructure `src/hooks/`, `src/services/`, `src/store/`, `src/types/` — they stay flat. One-folder-per-component applies to `src/components/` only.

## Reference
- Full folder-structure rules and examples: `.claude/agents/am-frontend.md`.
