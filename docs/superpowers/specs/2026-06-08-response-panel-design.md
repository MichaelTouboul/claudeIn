# Response → Right Panel — design spec

**Date:** 2026-06-08
**Status:** approved (brainstorm), pending implementation
**Topic:** a per-block button on chat responses that opens the response content in the right slide-over panel as a typed, interactive tab (table / code / text), with table editing + PDF/Excel export and a one-shot LLM prompt — all isolated from the chat conversation.

## 1. Goal

Give each chat response a lightweight affordance to "send" a piece of its content into the right panel (`UtilityPanel`, emptied 2026-06-08) where the user can work on it richly:

- **Table** → editable grid + sort + export Excel + PDF + standard chat actions (copy). Editing/sorting/export are **100% deterministic code, never an LLM**.
- **Code** → code view (Shiki, read-only).
- **Text** → rendered markdown.

All three tabs additionally expose **one shared one-shot LLM prompt** (the *only* place an LLM is invoked). The prompt result lands **in place** in the current tab.

The panel must be **stable and extensible** — future sidebar features (Task, Plan, Context, …) plug in as new tab kinds without reworking the host.

## 2. Key decisions (from brainstorm)

| Decision | Choice |
|---|---|
| Button granularity | **Per block** — each table/code block has its own button; text uses a per-message footer button |
| Panel hosting | **Stacked tabs** — each open = a new tab; reuses the Tabs slot already in the `UtilityPanel` header |
| Re-opening same block | Focus the existing tab (dedup by block id) |
| Table LLM semantics | Edit/sort/export = code only. The **prompt field is the sole LLM entry point** (e.g. "add a total column" → returns a modified table) |
| LLM result destination | **In place** in the current tab (autonomous workshop, isolated from chat). Chainable. No version history |
| Table editing | Ephemeral in-tab (source response stays immutable); export reflects current edited state |
| Text trigger | Button at the bottom of the message |
| Export libs | SheetJS (`xlsx`) for Excel, `jspdf` + `jspdf-autotable` for PDF |
| LLM call path | New one-shot `claude --print` IPC, separate from the chat session model |

## 3. Architecture

### Data flow

```
[Chat response]                          [UtilityPanel = right slide-over]
 TableBlock  [⤢ Open] ─────┐              ┌── tab bar (from store) ───────┐
 CodeBlock   [⤢ Open] ─────┼────────────► │ [Table 1][Code 2][+ future…]  │
 (prose)     [⤢ footer] ───┘              │ ───────────────────────────── │
                                          │  active tab body              │
                                          │  (editable table / code / md) │
                                          │  ┌ PromptBar (one-shot LLM) ─┐ │
                                          └──┴───────────────────────────┘ │
```

The button copies the block's content into a new panel tab. **It sends nothing to an LLM.** Everything afterward happens in the panel, isolated from the chat conversation.

### State — `src/store/usePanelStore.ts` (zustand, selector-based)

```ts
export const PanelTabKind = { Table: 'table', Code: 'code', Text: 'text' } as const;
export type PanelTabKind = (typeof PanelTabKind)[keyof typeof PanelTabKind];

type PanelTab = {
  id: string;          // stable key for dedup — derived as `${messageId}:${blockIndex}` (or a content hash for the text-footer case); blocks have no id today, so this key is computed at open-time
  kind: PanelTabKind;
  title: string;
  payload: TablePayload | CodePayload | TextPayload;  // discriminated by kind
};

// store: tabs: PanelTab[], activeTabId: string | null, isOpen: boolean
// actions: openTab(tab) (push or focus existing + isOpen=true), closeTab(id),
//          setActive(id), updateTab(id, patch), togglePanel()
```

This **replaces** the local `panelOpen` useState in `Dashboard`. The ☰ button keeps toggling `isOpen`.

### Rendering — enum + behavior map (per CLAUDE.md, no fallback chains)

`UtilityPanel.tsx` renders the tab bar from the store and the active tab body via:

```ts
const TAB_BODY: Record<PanelTabKind, ComponentType<{ tab: PanelTab }>> = {
  [PanelTabKind.Table]: TableTab,
  [PanelTabKind.Code]: CodeTab,
  [PanelTabKind.Text]: TextTab,
};
```

Adding a future feature = add a `PanelTabKind` value + one entry here. (We deliberately do **not** build a heavier "section registry" — the typed map is the extension point.)

### Component layout (mirrors hierarchy)

```
src/store/usePanelStore.ts
src/components/Workspace/DashboardArea/Dashboard/UtilityPanel/
├── UtilityPanel.tsx          ← tab bar (store) + TAB_BODY[active.kind]
├── panelTab.types.ts         ← PanelTabKind + payload types + TAB_BODY map
├── TableTab/
│   ├── TableTab.tsx          ← editable DataGrid + export toolbar
│   └── exporters.ts          ← toXlsx() / toPdf()
├── CodeTab/CodeTab.tsx
├── TextTab/TextTab.tsx
└── PromptBar/PromptBar.tsx   ← shared one-shot LLM input (all three tabs)
```

### Triggers

- `BlockShell`/`BlockAction` gain an `open`-style local action; `TableBlock` and `CodeBlock` register it (alongside their existing `Copy`).
- `MessageRow` gains a footer button that opens the message's prose as a `text` tab.

### Backend (Phase 4) — one-shot LLM

New `window.api.transform({ kind, instruction, content }) => Promise<string>`:
- `electron/services/transform.service.ts` — runs `claude --print` headless with a prompt built from `content` + `instruction`; returns the text result. No chat session, no DB persistence.
- `electron/ipc/transform.ipc.ts` (+ register in `ipc/index.ts`, expose in `preload.ts`, declare in `env.d.ts`).
- Table: instruct the model to return a markdown table; re-parse into grid rows/cols. Code/text: return the transformed content.

## 4. Delivery phases (test + commit between each)

1. **Panel tabs infra + open a table (read-only).** `usePanelStore`, `UtilityPanel` tab bar from store, "Open" action on `TableBlock`, `TableTab` renders the grid read-only. End-to-end visible slice.
2. **Table richness.** Editable cells, export Excel (SheetJS) + PDF (jsPDF + autotable), copy. Adds 3 deps.
3. **Code & Text tabs.** "Open" on `CodeBlock`, `MessageRow` text footer button, `CodeTab`/`TextTab` views.
4. **One-shot LLM prompt.** Backend `transform` IPC + `PromptBar` in all tabs, result lands in place.

## 5. Testing

- `usePanelStore` — open/dedup/close/setActive/togglePanel (vitest, like existing store tests).
- `TableTab/exporters` — round-trip rows/cols → xlsx/pdf builders produce expected structure.
- Tab components — render per kind (like existing `*.test.tsx`).
- `transform` IPC handler — handler-level test following the repo's IPC test pattern.

## 6. Out of scope (YAGNI)

Version history / undo, persistence of edits across sessions, export for code/text tabs, "open the whole response" as one unit, streaming diff of LLM results.

## 7. Conventions

Follows `CLAUDE.md` / `src/CLAUDE.md`: no `any`, named imports, 300-line file limit, design-system CSS vars, enum+behavior-map for finite state, state-management decision tree (panel state is app-global + changes often → zustand). `_ui/` primitives consumed, never Radix/MUI directly outside the allowed block exception.
