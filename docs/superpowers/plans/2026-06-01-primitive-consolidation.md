# `_ui/` primitive consolidation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Remediate the `ui-promotion-finder` audit — fix the `_ui/InlineImage` IPC leak, promote `ContextBar` to a Radix-Progress-backed `_ui/` primitive, and replace the hand-rolled overlays/dropdowns with Radix-backed `_ui/Dialog` + `_ui/Popover` — all ARIA-correct and behaviour-preserving.

**Architecture:** Wrap Radix primitives the same way `_ui/ContextMenu` wraps `@radix-ui/react-dropdown-menu` (Radix behaviour + design-system CSS-var styling, `Trigger asChild`). Radix supplies roles / focus-trap / Esc / outside-click; we add `aria-label`s on icon-only triggers per the `aria-requirements` skill.

**Tech Stack:** React 19, TypeScript, zustand, Tailwind 4 + CSS vars, Radix UI, Vitest + RTL.

**Spec:** `docs/superpowers/specs/2026-06-01-primitive-consolidation-design.md`

**Reference to read first:** `src/components/_ui/ContextMenu/ContextMenu.tsx` (the Radix-wrap pattern) and the `aria-requirements` skill (`.claude/skills/aria-requirements/SKILL.md`).

**Conventions:** named exports only; `@/` alias; no `any`; 300-line cap; CSS vars via inline `style={{}}` or design-system classes (never hardcoded Tailwind colors); explicit ternaries; keys = stable ids; **only `_ui/` gets an `index.ts` barrel**; after any move run `npm run lint:fix`.

**Gate (end of every task):** `npx tsc --noEmit -p tsconfig.web.json` (0) · `npm run lint` (0/0 — the `jsx-a11y` rules will catch missing labels) · `npx vitest run` (all pass) · `npx electron-vite build` (exit 0). Run `npm install --legacy-peer-deps` first if `node_modules` is missing.

---

## Task 1: Fix the `_ui/InlineImage` IPC leak

**Files:** `src/components/_ui/InlineImage/InlineImage.tsx`; Create `src/hooks/useImageDataUrl.ts`; consumers of `InlineImage`.

- [ ] **Step 1:** Read `InlineImage.tsx` and find the `window.api.readImageAsDataUrl(...)` call + how the result is used. Identify all importers: `grep -rn "InlineImage" src`.
- [ ] **Step 2: Create the hook** `src/hooks/useImageDataUrl.ts` that owns the IPC:

```ts
import { useEffect, useState } from 'react';

export function useImageDataUrl(filePath: string | null): { src: string | null; loading: boolean; error: boolean } {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!filePath) { setSrc(null); return; }
    let cancelled = false;
    setLoading(true); setError(false);
    window.api.readImageAsDataUrl(filePath)
      .then((url) => { if (!cancelled) { setSrc(url); setLoading(false); } })
      .catch(() => { if (!cancelled) { setError(true); setLoading(false); } });
    return () => { cancelled = true; };
  }, [filePath]);
  return { src, loading, error };
}
```
(Match the real `window.api.readImageAsDataUrl` signature from `src/env.d.ts`.)

- [ ] **Step 3: Make `InlineImage` pure** — remove the `window.api` import/call; change its props to take a resolved `src: string | null` (+ optional `loading`/`error` for the placeholder). Keep its presentational markup/styling. It must no longer reference `window.api`.
- [ ] **Step 4: Update consumers** — each consumer calls `useImageDataUrl(filePath)` and passes `src` (and loading/error) to `<InlineImage>`. Preserve current behaviour exactly.
- [ ] **Step 5:** Gate, then commit: `git commit -m "fix(ui): lift IPC out of _ui/InlineImage into a useImageDataUrl hook"`

---

## Task 2: Promote `ContextBar` to `_ui/` over Radix Progress

**Files:** add `@radix-ui/react-progress`; `git mv` ContextBar into `_ui/`; update 3 importers.

- [ ] **Step 1:** `npm install --legacy-peer-deps @radix-ui/react-progress`.
- [ ] **Step 2: Move it** — `git mv src/components/ContextBar src/components/_ui/ContextBar`. Add `src/components/_ui/ContextBar/index.ts` → `export { ContextBar, type ContextBarProps } from './ContextBar';` (export the props type). Fix all import paths repo-wide: `grep -rln "components/ContextBar" src` → update to `components/_ui/ContextBar` (importers: `ContextTab`, `AgentRow`, `OrchestratorTree`). The `formatTokens`/`progressColor` helpers live in `Workspace/utils.ts` — keep importing them via `@/components/Workspace/utils` (they're domain-free); they may be relocated later by the structure-cleaner.
- [ ] **Step 3: Wrap Radix Progress** — reimplement the bar with `@radix-ui/react-progress`:

```tsx
import * as Progress from '@radix-ui/react-progress';
// Progress.Root value={percent} max={100}  +  Progress.Indicator with the colored fill
// keep the same outer sizing + the title tooltip (`In: … · Out: … · $… · …% context`)
// keep prop shape: { percent, tokensIn, tokensOut, costUsd }
```
Radix emits `aria-valuenow`/`role="progressbar"` from `value`/`max` — don't hand-add them. Keep the design-system colors via `progressColor`.

- [ ] **Step 4:** Gate, then commit: `git commit -m "refactor(ui): promote ContextBar to _ui/ over Radix Progress"`

---

## Task 3: `_ui/Dialog` + migrate `GlobalChatModal` and `UtilityPanel`

**Files:** add `@radix-ui/react-dialog`; Create `_ui/Dialog/`; Modify `GlobalChatModal`, `UtilityPanel`.

- [ ] **Step 1:** `npm install --legacy-peer-deps @radix-ui/react-dialog`.
- [ ] **Step 2: Create `_ui/Dialog/Dialog.tsx`** wrapping `@radix-ui/react-dialog` (pattern: like `_ui/ContextMenu`). API:

```tsx
export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: 'center' | 'drawer-right';   // default 'center'
  children: ReactNode;                    // the panel content
  title?: string;                         // for the accessible name (Dialog.Title, visually-hidden if no visible title)
};
```
Use `Dialog.Root` (`open`/`onOpenChange`), `Dialog.Portal`, a styled `Dialog.Overlay` (backdrop, CSS-var/`rgba` tint), and a styled `Dialog.Content`. `center` = centered card; `drawer-right` = full-height right slide-over (`fixed right-0 top-0 h-full`). Include a `Dialog.Title` (use the `title` prop; if there's no visible title, wrap it with Radix `VisuallyHidden` or `@radix-ui/react-visually-hidden`) so the dialog has an accessible name. Esc + overlay-click close come from Radix. Add `index.ts` barrel.
- [ ] **Step 3: Write a small RTL test** `_ui/Dialog/Dialog.test.tsx` — renders children when `open`, fires `onOpenChange(false)` on Esc. (Use `@testing-library/react` + `fireEvent.keyDown(document, {key:'Escape'})` or query the close path.) Run it red→green.
- [ ] **Step 4: Migrate `GlobalChatModal`** — wrap its content in `<Dialog open onOpenChange={…} variant="center" title="Chat">`; remove the hand-rolled `fixed inset-0` backdrop + panel. Its `onClose` becomes `onOpenChange(false)`.
- [ ] **Step 5: Migrate `UtilityPanel`** — replace its `absolute inset-0` overlay + manual `keydown`/Esc effect with `<Dialog open={open} onOpenChange={(o)=>!o && onClose()} variant="drawer-right" title="Context / Task / Plan">`; keep the Context/Task/Plan inner `Tabs` switch as the content.
- [ ] **Step 6:** Gate, then commit: `git commit -m "feat(ui): _ui/Dialog (center+drawer) over Radix; migrate GlobalChatModal + UtilityPanel"`

---

## Task 4: `_ui/Popover` + migrate the three dropdowns

**Files:** add `@radix-ui/react-popover`; Create `_ui/Popover/`; Modify `ProjectSwitcher`, `ProjectPicker`, `AddTabMenu`.

- [ ] **Step 1:** `npm install --legacy-peer-deps @radix-ui/react-popover`.
- [ ] **Step 2: Create `_ui/Popover/Popover.tsx`** wrapping `@radix-ui/react-popover`. API:

```tsx
export type PopoverProps = {
  trigger: ReactNode;                       // the button (rendered via Trigger asChild)
  children: ReactNode;                      // the panel content
  align?: 'start' | 'center' | 'end';       // default 'start'
  className?: string;                        // panel className
};
```
`Popover.Root` + `Popover.Trigger asChild` + `Popover.Portal` + styled `Popover.Content` (CSS-var panel, shadow, `sideOffset`). Outside-click + Esc from Radix. Add `index.ts` barrel. Light RTL test: opens on trigger click, content visible.
- [ ] **Step 3: Migrate `ProjectSwitcher`** — remove its `useState(open)` + `useEffect` mousedown listener + `absolute` panel; render `<Popover trigger={<button …current trigger…>}>` with the project list as content. The trigger button must keep an accessible name (it has text; fine).
- [ ] **Step 4: Migrate `ProjectPicker`** — same; the `+` trigger is icon-only → ensure `aria-label="Open a project"` (it has `title` already; add `aria-label` too).
- [ ] **Step 5: Migrate `AddTabMenu`** — same; the `+` trigger icon-only → `aria-label="New tab"`. Keep the New-chat / agent-list content.
- [ ] **Step 6:** Gate, then commit: `git commit -m "feat(ui): _ui/Popover over Radix; migrate ProjectSwitcher/ProjectPicker/AddTabMenu"`

---

## Task 5: Full gate + a11y sanity

- [ ] **Step 1: Full gate** — `tsc` 0 · `lint` 0/0 · `vitest` all pass (incl. new Dialog/Popover tests) · `electron-vite build` exit 0.
- [ ] **Step 2: a11y spot-check** — confirm `grep -rn "window.api" src/components/_ui` returns nothing (no IPC in `_ui/`), and every icon-only trigger touched has an `aria-label`/`title`. (A deeper `accessibility-auditor` sweep runs separately after merge.)
- [ ] **Step 3: Manual visual check (`npm run dev`)** — the global chat modal, the Context/Task/Plan drawer, the project switcher / picker / add-tab menus, and the context/usage bars all look and behave exactly as before; Esc and outside-click close the overlays.

---

## Notes

- **ARIA comes mostly from Radix** (roles, `aria-modal`, focus-trap, `aria-valuenow`, keyboard) — don't hand-roll it; just label icon-only triggers.
- **After merge (main session, not this worktree):** run `accessibility-auditor` (broader a11y pass) then `dead-code-sweeper` (the moved `ContextBar`, removed overlay/listener code, any orphaned helpers).
- **Deferred:** `_ui/Tabs` rewrap over Radix Tabs, `EditField`→Select, `ResizeHandle`→Separator (backlog).
