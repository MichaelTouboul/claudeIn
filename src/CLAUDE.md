# src/ — Renderer process (the "front")

Auto-loaded when working in `src/`. The root `CLAUDE.md` (architecture, commands, and transversal rules — TypeScript, imports, 300-line limit, linting) still applies on top of this.

This is the **sandboxed** side: Chromium + React 19, the UI. It has **no Node access** — it cannot read files, touch the DB, or spawn processes. It can only call the back through `window.api`.

## Layout

- **`App.tsx`** — root component (one of the only allowed default exports, with `main.tsx`).
- **`pages/`** — the page **entry** components only, one folder per page: `pages/{Onboarding,Home,Dashboard,Customize}Page/<Page>Page.tsx` (+ `pages/__tests__/<Page>/` mirror for the page-entry tests). `App.tsx`'s `PAGE_VIEW` map renders them. A page's child components do **not** live here — they live under `components/<Page>/` (see Component placement).
- **`components/`** — feature components grouped **per page** (`components/{Onboarding,Home,Customize,Dashboard}/`); generic primitives in **`components/_ui/`**; shared/app-mounted components stay at the `components/` root (see Component placement).
- **`hooks/`** — `useIPC.ts`, `useSessions.ts`, `useProjects.ts`, `useFavorites.ts`, … (kept **flat** — several hooks are shared across pages).
- **`services/api.ts`** — thin wrapper over `window.api`. **All** back communication goes through here.
- **`store/`** — zustand stores (no React contexts here). App-global/shared stores sit at the root (`useAppStore`, `useImproveStore`, `useImproveModalStore`, `useWorkspaceStore`); per-page stores are grouped under `store/dashboard/` and `store/customize/` (see Store placement).
- **`contexts/`** — React contexts (e.g. `ProjectContext`), the home for `createContext` providers/hooks. Distinct from `store/` (zustand).
- **`env.d.ts`** — TypeScript declaration of `window.api` (the IPC contract the front sees).
- **`lib/`** — framework-agnostic helpers, split into **`lib/utils/`** (functions) and **`lib/types/`** (shared types), each with an `index.ts` barrel. See "lib structure" below.
- **`index.css`** — design system CSS custom properties. **`lib/utils/cn.ts`** — `cn()` (`clsx` + `tailwind-merge`).

### App shell

`DashboardPage` is a thin, fixed `h-full flex flex-col` shell (no page scroll — only inner panes scroll): `Header` · `Workspace` (flex-1) · `Footer`. The shell components belong to the Dashboard page, so they live under `components/Dashboard/`:

```
components/Dashboard/
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

(`components/Dashboard/Header/` holds the Dashboard top bar's `Header.tsx`; the App-mounted `Header/ImproveNotification` overlay stays at the `components/` root — see Component placement.)

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
- **Nesting follows real ownership — no hard depth cap.** Nest a single-owner child inside its true parent **even at depth 3–4** if that's where the component hierarchy actually puts it (e.g. `Dashboard/Workspace/DashboardArea/Dashboard/InternalTabBar/`). The folder tree must mirror the component tree; do **not** hoist a single-owner child to the root just to stay shallow. (This is folder depth only — the 300-line file limit and code-nesting concerns are separate.) Depth beyond ~4 is a smell worth questioning the component decomposition, not a rule violation.
- `_ui/` holds **reusable primitives with no domain knowledge**. **Only** `_ui/` components get an `index.ts` barrel; feature components do not.
- Do **not** apply one-folder-per-thing to `hooks/`, `services/`, `store/`, `types/` — their **source files** stay flat. `hooks/`, `services/`, `types/` keep a single flat folder; `store/` files are flat **within** their grouping folder (root / `dashboard/` / `customize/`, see "Store placement"). The only structure these areas gain is a `__tests__/` (see "Tests" below). One-folder-per-thing is for components only.

### Per-page grouping

Feature components are grouped by the page that owns them — `components/{Onboarding,Home,Customize,Dashboard}/` — while the page **entry** lives in `pages/<Page>Page/` (see Layout). A component owned by exactly one page lives under that page's `components/<Page>/` folder (then nested by ownership inside it). A component shared by **two or more pages**, or mounted by the `App` shell itself, stays at the **`components/` root** (e.g. `UserProfileView` — Onboarding+Home; `DevReset` — Home+Dashboard; `ImproveModal` and `Header/ImproveNotification` — App-mounted overlays). The same promotion rule applies one level up: a single-page component that becomes used by a second page is promoted from `components/<Page>/` to the `components/` root.

When a component file nears 300 lines, split it (front-specific targets, see root for the general rule): extract sub-components into their own folders, then custom hooks into `hooks/`, then helpers/types into sibling files.

## `lib/` structure

`lib/` is split by kind, each with a barrel:

```
lib/
├── utils/          ← pure helper functions (cn, contentHash, elementToComponent, formatTokens, platform)
│   └── index.ts    ← barrel: import utils via `@/lib/utils`
├── types/          ← ALL renderer shared types live here (agent.types, spawn.types, …, ComponentSource)
│   └── index.ts    ← barrel: import types via `@/lib/types`
└── __tests__/      ← lib tests
```

- **Consume utils and types through their barrel** (`@/lib/utils`, `@/lib/types`) — the category in the path tells you what kind of thing it is.
- **No top-level `lib/index.ts` barrel.** We want imports to name their category explicitly, not collapse everything behind one `@/lib`.
- **`lib/types/` is the single home for shared renderer types** — there is no `src/types/`. The **only** exception is **component-local types** (a component's own `types.ts`), which stay next to the component (see "Component placement"). New shared types go in `lib/types/<name>.types.ts` and get re-exported from its `index.ts`.

## Store placement

`store/` mirrors the page split that `components/` uses, but only one level deep (the files stay flat within each group — no one-folder-per-store):

```
store/
├── useAppStore.ts            ← app-global / shared stores stay at the root:
├── useImproveStore.ts          useAppStore, useImproveStore, useImproveModalStore, useWorkspaceStore
├── useImproveModalStore.ts
├── useWorkspaceStore.ts
├── dashboard/                ← stores owned by the Dashboard page
│   ├── useEventsStore.ts  usePanelStore.ts  useConsoleStore.ts  useDashboardStore.ts
│   ├── useDashboardUIStore.ts  useModelStore.ts  useConversationStatusStore.ts
│   ├── useConversationTitlesStore.ts  useAgentDismissStore.ts  useFavoritesStore.ts
│   ├── useWorkflowViewStore.ts  usePinnedStore.ts
│   └── __tests__/
└── customize/                ← stores owned by the Customize page
    ├── useCustomizeStore.ts
    └── __tests__/
```

- Import via the real (grouped) path: `@/store/dashboard/useEventsStore`, `@/store/customize/useCustomizeStore`, `@/store/useAppStore` for the root ones. There is no store barrel.
- A store used app-wide or by 2+ pages lives at the **root**; a single-page store lives in that page's group. Promote root-ward if a grouped store gains a second page consumer.

## Tests live in `__tests__/`

Test files are **never co-located** in the source listing — they pollute the tree and bury the real files. Each area keeps its tests in a `__tests__/` folder:

- **`hooks/`, `lib/`** — one `__tests__/` at the folder root (sources stay flat next to it).
- **`store/`** — a `__tests__/` per grouping folder (`store/__tests__/` for the root stores, `store/dashboard/__tests__/`, `store/customize/__tests__/`); sources stay flat next to each.
- **`pages/`** — `pages/__tests__/<Page>/` mirrors the page entries.
- **`components/`** — a single **`components/__tests__/` that mirrors the component tree** (`components/__tests__/Dashboard/Workspace/DashboardArea/Console/Console.test.tsx`). Component tests reference sources via **`@/` aliases**, never deep `../../../` relatives — the alias is stable regardless of how deep the mirror goes.

## Design system

All styling uses CSS custom properties defined in `index.css`:

```
--color-surface-0: #14161b    (app background — soft blue-charcoal, never pure black)
--color-surface-1: #1d2027    (panel backgrounds)
--color-surface-2: #23272f    (card/hover backgrounds)
--color-surface-3: #2b2f39    (elevated elements)
--color-border: #2b2f39        --color-border-subtle: #181b21
--color-border-strong: #3a4150 (3:1 control/input outlines — WCAG 1.4.11; decorative hairlines keep --color-border)
--color-fg: #eef1f6            --color-fg-muted: #b3bccb       --color-fg-subtle: #8b93a3
  (legacy aliases: --color-text-primary / -secondary / -muted map onto these)
--color-accent: #818cf8 (indigo) --color-accent-dim: rgba(129,140,248,0.14)
--color-accent-solid: #4f5dd9 (solid fill for the primary button — white text)
--color-text-on-accent: #14161b (dark text on a light --color-accent fill)
--color-active: #45d483        --color-danger: #ff8585
--color-warning: #f0c14b (yellow — tool/auth/hooks)  --color-info: #6db4ff (blue — sub-agent)
--color-history: #b794f6 (purple — memory/history)
--color-neutral-fg/-bg/-fg-strong  (#8b93a3 / #2b2f39 / #d7dce4 — attachment chip neutrals)
--font-sans: 'Geist'   --font-mono: 'Geist Mono'
```

**Rules:**
- **No raw color values in components — always a token in `index.css`.** Every color is a CSS var defined in `index.css`; components never carry a hex/`rgb()`/named-Tailwind-palette color. New hue? Add a semantic token to `index.css` first, then reference it. (The ONE exception is the interactive-block library-theme bridge below.)
- **Tailwind CSS 4** + PostCSS. **NEVER** use hardcoded Tailwind palette colors (`bg-gray-800`, `text-yellow-400`) — use the CSS-var tokens.
- Reference CSS vars in `style={{ }}` *or* via a Tailwind arbitrary value in `className` (`text-[var(--color-warning)]`, `bg-[var(--color-info)]`) — match the file's existing pattern. Plain token utilities (`text-fg`, `bg-surface-2`, `border-border-strong`) are generated from the `@theme` block.
- `var(--font-mono)` for code/data, `var(--font-sans)` for UI labels. `tabular-nums` for numbers.
- Hover states via `onMouseEnter`/`onMouseLeave` (inline style changes).
- Utility classes available: `surface-grain`, `glow-cyan`, `glow-active`.
- **Interactive block exception:** components under `components/ResponseBody/blocks/` MAY embed a third-party UI library (e.g. MUI DataGrid, Shiki) behind `BlockShell`. Bridge the library's theme to the CSS-var tokens. This is the ONE place the "no styles outside the design system" rule is relaxed; everywhere else still uses the CSS-var system.

## `_ui/` primitives stack

`_ui/` components are built on three libraries. **Feature components consume `_ui/` primitives — they never touch Radix or `cva` directly.** `cn` is used everywhere.

- **Radix UI** — accessible, unstyled behavior. Install per primitive (`npm i @radix-ui/react-dialog`), wrap each in a `_ui/` component that owns the styling. Feature components import from `_ui/`, never from `@radix-ui/*`.
- **`cn`** (`clsx` + `tailwind-merge`, defined once at `lib/utils/cn.ts`, imported via `@/lib/utils`) — for any conditional/merged className or when merging an incoming `className` prop: `cn('px-3 py-1', isActive && 'bg-active', className)`.
- **`cva`** — typed variants (size, intent, …), **inside `_ui/` components only**. Variants must compose Tailwind utilities wired to design-system CSS vars — never hardcoded colors.

`_ui/` primitives extend `React.ComponentProps<'tag'>` so native DOM props are inherited, and **export** their props type:

```tsx
export type ButtonProps = ComponentProps<'button'> & VariantProps<typeof button>;
export function Button({ intent, size, className, ...props }: ButtonProps) { /* … */ }
```

Feature-component prop types stay next to the component (same file), not exported unless reused.

### Layout primitives

`_ui/` ships four homegrown layout primitives — **prefer them over raw `flex`/`grid` className for leaf layout**. They are `cva`-backed, polymorphic (`as`), and merge a passthrough `className` *after* the variants (so callers keep non-layout classes like padding/bg/`shrink-0`).

- **`Flex`** — a flex box. Axes: `direction` (`row`|`col`), `align` (`start`|`center`|`end`|`stretch`|`baseline`), `justify` (`start`|`center`|`end`|`between`|`around`), `gap`, `wrap`. Use for justify boxes / footers (`<Flex justify="end">`).
- **`Stack`** — vertical shorthand (= `Flex direction="col"`): `gap`, `align?`, `as?`.
- **`Inline`** — horizontal shorthand (= `Flex direction="row"` + `align="center"` by default): `gap`, `justify?`, `as?`.
- **`Grid`** — a grid box: `cols` (1–12), `rows?` (1–6), `gap`, `as?`.

**`gap` scale (Tailwind's spacing scale, half-steps included):** `0 | 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 4 | 6 | 8` → `gap-0 … gap-8`. Pass numerically: `<Inline gap={2.5}>`.

Polymorphic `as` is fully typed: `<Stack as="form" noValidate onSubmit={…}>`, `<Inline as="label">`, `<Stack as="section">`. Because the element type drives the props, an inline event handler on an `as`-element may need an explicit param type (e.g. `onSubmit={(e: FormEvent) => …}`).

**Stay raw (do NOT wrap)** for app-shell sizing and divergent one-offs: anything with `flex-1`/`grow`/`min-h-0`/`overflow-*`/`h-full`, responsive `md:`/`sm:`, arbitrary `grid-cols-[…]`, split `gap-x`/`gap-y`, `self-*`/`place-*`, `inline-flex`, or dynamic `cn(…)` layout. When unsure, leave raw.

## State management (mandatory)

Every new or moved piece of state MUST have a deliberately chosen home. Default to the **narrowest** scope that works; widen only when a concrete need forces it.

**Decision tree — stop at the first YES:**
1. Used only inside one component? → **`useState`/`useReducer`** (local).
2. Needed by 1–2 direct children of its owner? → **props** (one hop down).
3. Needed across a subtree, the only problem is prop-drilling, AND it changes *rarely* (user, theme, locale, permissions, feature flags, app config)? → **React context** (lives in `src/contexts/`, not `store/`) at the common ancestor.
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
