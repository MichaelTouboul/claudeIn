# src/ — Renderer process (the "front")

Auto-loaded when working in `src/`. The root `CLAUDE.md` (architecture, commands, and transversal rules — TypeScript, imports, 300-line limit, linting) still applies on top of this.

This is the **sandboxed** side: Chromium + React 19, the UI. It has **no Node access** — it cannot read files, touch the DB, or spawn processes. It can only call the back through `window.api`.

## Layout

- **`App.tsx`** — root component (one of the only allowed default exports, with `main.tsx`).
- **`components/`** — feature components at the root; generic primitives in **`components/_ui/`**.
- **`hooks/`** — `useIPC.ts`, `useSessions.ts`, `useProjects.ts`, `useFavorites.ts`, …
- **`services/api.ts`** — thin wrapper over `window.api`. **All** back communication goes through here.
- **`store/useAppStore.ts`** — global state (zustand).
- **`pages/`** — top-level views.
- **`env.d.ts`** — TypeScript declaration of `window.api` (the IPC contract the front sees).
- **`index.css`** — design system CSS custom properties. **`lib/cn.ts`** — `cn()` (`clsx` + `tailwind-merge`).

### App shell

`App.tsx` is a thin, fixed `h-full flex flex-col` shell (no page scroll — only inner panes scroll): `Header` · `Workspace` (flex-1) · `Footer`. The shell tree:

```
components/
├── Header/                  ← top bar (logo, ProjectSwitcher, StatsBar, Chat)
├── Footer/                  ← thin status band (placeholder for now)
└── Workspace/               ← middle shell
    ├── Workspace.tsx        ← Sidebar | DashboardArea (or project picker empty-state)
    ├── WorkspaceBar/        ← dashboard tabs (＋ opens a launcher dashboard)
    ├── Sidebar/             ← Activity + Library (ConversationList, PanelsArea, …)
    └── DashboardArea/       ← WorkspaceBar + Dashboard + Console
        ├── Dashboard/       ← InternalTabBar, DashboardSurface (keep-alive tab bodies), LauncherView, UtilityPanel, SkillDetail, ChatTab
        └── Console/         ← terminal / events panel (TerminalView)
```

## Talking to the back

- **No `fetch()`, no direct Node access.** Every renderer → main call goes through `window.api` (typed in `env.d.ts`), ideally via `services/api.ts`.
- Push events (real-time data from the main process) come via `window.api.onEvent(callback)`.
- If a method you need isn't on `window.api`, it must be added on the back first (`electron/` — service + ipc + preload + `env.d.ts`). Don't fake it in the renderer.

## Component placement

One component per folder, **PascalCase** naming, all under `components/`. **The folder hierarchy mirrors the component hierarchy.**

```
components/
├── _ui/                  ← reusable, generic primitives ONLY (Accordion, MarkdownBody, …)
│   └── Accordion/
│       ├── Accordion.tsx
│       ├── Accordion.css ← only if it has its own styles
│       └── index.ts      ← REQUIRED for _ui only: export { Accordion }
├── AgentChat/            ← parent feature component
│   ├── AgentChat.tsx
│   ├── AgentChatHeader/  ← child, used ONLY by AgentChat → nested inside it
│   └── AgentChatInput/
└── AgentDetail/          ← independent feature → sibling folder
```

- One folder per component; folder name = component name. A `.css` file exists **only when the component has its own styles** — never create an empty one.
- A component used by a **single parent** lives **inside that parent's folder**. Two independently-used components are **sibling folders**.
- **Promotion rule:** as soon as a child is used by **more than one parent**, promote it → to `_ui/` if it's a generic primitive, otherwise to `components/` root (sibling of its former parents).
- **Nesting follows real ownership — no hard depth cap.** Nest a single-owner child inside its true parent **even at depth 3–4** if that's where the component hierarchy actually puts it (e.g. `Workspace/DashboardArea/Dashboard/InternalTabBar/`). The folder tree must mirror the component tree; do **not** hoist a single-owner child to the root just to stay shallow. (This is folder depth only — the 300-line file limit and code-nesting concerns are separate.) Depth beyond ~4 is a smell worth questioning the component decomposition, not a rule violation.
- `_ui/` holds **reusable primitives with no domain knowledge**. **Only** `_ui/` components get an `index.ts` barrel; feature components do not.
- Do **not** restructure `hooks/`, `services/`, `store/`, `types/` — they stay flat. One-folder-per-thing is for components only.

When a component file nears 300 lines, split it (front-specific targets, see root for the general rule): extract sub-components into their own folders, then custom hooks into `hooks/`, then helpers/types into sibling files.

## Design system

All styling uses CSS custom properties defined in `index.css`:

```
--color-surface-0: #06080c    (deepest background)
--color-surface-1: #0a0e14    (panel backgrounds)
--color-surface-2: #111620    (card/hover backgrounds)
--color-surface-3: #181e2a    (elevated elements)
--color-border: #1e2636        --color-border-subtle: #151b26
--color-text-primary: #e2e8f0  --color-text-secondary: #8892a4  --color-text-muted: #4a5568
--color-accent: #06b6d4 (cyan) --color-accent-dim: rgba(6,182,212,0.12)
--color-active: #4ade80        --color-danger: #f87171
--font-sans: 'IBM Plex Sans'   --font-mono: 'JetBrains Mono'
```

**Rules:**
- **Tailwind CSS 4** + PostCSS. **NEVER** use hardcoded Tailwind colors (`bg-gray-800`, `text-cyan-400`) — use the CSS vars.
- Reference CSS vars via `style={{ }}` (Tailwind can't reference them).
- `var(--font-mono)` for code/data, `var(--font-sans)` for UI labels. `tabular-nums` for numbers.
- Hover states via `onMouseEnter`/`onMouseLeave` (inline style changes).
- Utility classes available: `surface-grain`, `glow-cyan`, `glow-active`.
- **Interactive block exception:** components under `components/ResponseBody/blocks/` MAY embed a third-party UI library (e.g. MUI DataGrid, Shiki) behind `BlockShell`. Bridge the library's theme to the CSS-var tokens. This is the ONE place the "no styles outside the design system" rule is relaxed; everywhere else still uses the CSS-var system.

## `_ui/` primitives stack

`_ui/` components are built on three libraries. **Feature components consume `_ui/` primitives — they never touch Radix or `cva` directly.** `cn` is used everywhere.

- **Radix UI** — accessible, unstyled behavior. Install per primitive (`npm i @radix-ui/react-dialog`), wrap each in a `_ui/` component that owns the styling. Feature components import from `_ui/`, never from `@radix-ui/*`.
- **`cn`** (`clsx` + `tailwind-merge`, defined once at `lib/cn.ts`) — for any conditional/merged className or when merging an incoming `className` prop: `cn('px-3 py-1', isActive && 'bg-active', className)`.
- **`cva`** — typed variants (size, intent, …), **inside `_ui/` components only**. Variants must compose Tailwind utilities wired to design-system CSS vars — never hardcoded colors.

`_ui/` primitives extend `React.ComponentProps<'tag'>` so native DOM props are inherited, and **export** their props type:

```tsx
export type ButtonProps = ComponentProps<'button'> & VariantProps<typeof button>;
export function Button({ intent, size, className, ...props }: ButtonProps) { /* … */ }
```

Feature-component prop types stay next to the component (same file), not exported unless reused.

## State management (mandatory)

Every new or moved piece of state MUST have a deliberately chosen home. Default to the **narrowest** scope that works; widen only when a concrete need forces it.

**Decision tree — stop at the first YES:**
1. Used only inside one component? → **`useState`/`useReducer`** (local).
2. Needed by 1–2 direct children of its owner? → **props** (one hop down).
3. Needed across a subtree, the only problem is prop-drilling, AND it changes *rarely* (user, theme, locale, permissions, feature flags, app config)? → **React context** at the common ancestor.
4. Changes *often*, has *many actions*, read by *independent subtrees*, or must survive unmount (filters, open panels/modals, editor/workflow state, selected project, anything app-global)? → **zustand** (`store/useAppStore.ts`).

**Hard rules:**
- **Context = global + stable only.** Never put high-frequency state (live input, drag, fast-changing server data, large mutating objects) in context — every consumer re-renders on each new `value`. Use zustand.
- **Always split context** into two providers: one for reactive *data*, one for stable *actions/handlers*, and `useMemo` the value — so handler-only consumers don't re-render on data change.
- **Zustand is always selector-based:** `useAppStore((s) => s.x)`. Never call `useAppStore()` with no selector (subscribes to the whole store → re-renders on every change). Select the narrowest slice you use.
- **Don't dump local UI state in zustand** "because it's easier than props" — move it back to its owner.

**When to ASK instead of auto-deciding:** borderline context-vs-zustand (one near-app-wide subtree); local UI state someone wants globalized; or more than one reasonable home exists and the choice touches >3 files.

## Conversation titles (renderer side)

Titles are keyed by **`claudeSessionId`** (the persisted id; see `electron/CLAUDE.md` for the `localSessionId` vs `claudeSessionId` split). `useConversationTitlesStore` (zustand) holds `{ aiTitle, userTitle }` per claudeSessionId, fed by the `conversation_titled` push event (AI title) and by `setUserTitle` (rename, optimistic) + `window.api.setConversationTitle` (persist). Surfaces read it with precedence **`userTitle ?? aiTitle ?? session.title ?? firstPrompt`**: sidebar rows + the ACTIVITY list overlay the store on their label directly; the open chat tab gets its title copied in via `useWorkspaceStore.retitleChatTab` (which only overwrites a *generic* tab title, except a user rename passes `force` to override even the AI title). Chat tabs carry their `claudeSessionId` (threaded `ChatTab → AgentChat tabId prop → setTabClaudeSessionId`) so a live chat can be matched/renamed like a persisted session.

## React patterns

- **Explicit ternaries** for conditional rendering: `{isReady ? <Panel /> : null}` — not `{isReady && <Panel />}` (renders `0`/`''` on accidental falsy-but-not-boolean left side).
- **Keys = unique IDs, NEVER the array index** (hard rule, ESLint error). Index keys reuse DOM nodes by position on reorder/filter/insert → focus, scroll, and stale state jump to the wrong row. If there's no natural id, **derive one** from fields (`key={`${h.event}:${h.matcher}`}`). If you truly can't, that's a data-modelling smell — dedupe or wrap upstream as `{ id, value }`; don't reach for the index.
- **`useMemo` only when it matters** — a measurably expensive computation, or a stable reference needed for an effect dep / memoized child prop. Otherwise compute inline.
- **`gap` on flex/grid, not margins on children** — no margin collapsing, no orphan margins.
