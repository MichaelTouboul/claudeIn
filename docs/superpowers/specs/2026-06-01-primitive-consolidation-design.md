# Design — `_ui/` primitive consolidation (Radix + ARIA)

**Date:** 2026-06-01
**Status:** Approved (from `ui-promotion-finder` audit + user go) — pending plan
**Pillar:** UX beyond the terminal (Pillar #1) + clean architecture
**Scope tag:** quality / debt

## Problem

The `ui-promotion-finder` audit found concrete `_ui/` debt:
1. **`_ui/InlineImage` leaks IPC** — calls `window.api.readImageAsDataUrl()` inside a supposed primitive (forbidden: a `_ui/` primitive has no `window.api`/domain knowledge).
2. **`ContextBar` should be a `_ui/` primitive** — domain-free, used by 3 unrelated parents (`ContextTab`, `AgentRow`, `OrchestratorTree`); also a bespoke `width:%` bar that should wrap **Radix Progress**.
3. **Three hand-rolled outside-click dropdowns** — `ProjectSwitcher`, `ProjectPicker`, `AddTabMenu` triplicate `useState(open)` + `document.addEventListener('mousedown')` + an `absolute` panel. Should wrap **Radix Popover**.
4. **Two hand-rolled overlays** — `GlobalChatModal` (`fixed inset-0` modal) and `UtilityPanel` (right slide-over with a manual `Esc` handler). Should wrap **Radix Dialog** (drawer variant), gaining focus-trap / Esc / scroll-lock for free.

All of this must also satisfy the project's **ARIA requirements** (the `aria-requirements` skill): Radix gives roles/focus/keyboard for free; icon-only triggers still need `aria-label`.

## Goals

Consolidate the above onto Radix-backed `_ui/` primitives, ARIA-correct, behaviour unchanged, gate-green throughout. Then a follow-up accessibility pass and dead-code cleanup.

## New / changed primitives

- **NEW `_ui/Dialog/`** — wraps `@radix-ui/react-dialog`. Exposes a `Dialog` with a `variant: 'center' | 'drawer-right'` (modal vs right slide-over), `open`/`onOpenChange`, a styled `Overlay` + `Content` (CSS-var tokens), built-in close on Esc / overlay click (Radix). Barrel `index.ts`.
- **NEW `_ui/Popover/`** — wraps `@radix-ui/react-popover`. A trigger + an anchored, styled content panel for **rich rows** (the project/agent lists). Outside-click + Esc come from Radix. Barrel `index.ts`.
- **MOVE `ContextBar` → `_ui/ContextBar/`** (with barrel), reimplemented over `@radix-ui/react-progress` (Progress.Root + Indicator) while keeping the exact prop shape `{ percent, tokensIn, tokensOut, costUsd }` and the tooltip title. Its `formatTokens`/`progressColor` helpers (`Workspace/utils.ts`) are domain-free — keep importing them, or inline; do not pull domain in.
- **FIX `_ui/InlineImage`** — remove the `window.api` call. New `hooks/useImageDataUrl.ts` (renderer hook) does the IPC; `InlineImage` becomes pure, taking a resolved `src`/`dataUrl` (+ optional `loading`/`error` states). Consumers call the hook and pass the result. If `InlineImage` is only ever the app image loader, the alternative is to demote it to `components/` — **prefer keeping it a pure primitive** + the hook.

Reference pattern for all wraps: the existing `_ui/ContextMenu/ContextMenu.tsx` (wraps `@radix-ui/react-dropdown-menu`, styles with `cn` + design-system classes, `Trigger asChild`).

## Migrations

- `GlobalChatModal` → render inside `_ui/Dialog` (`variant="center"`); drop the hand-rolled `fixed inset-0` backdrop/panel.
- `UtilityPanel` → `_ui/Dialog` (`variant="drawer-right"`); drop the manual `keydown`/Esc handler and the `absolute inset-0` overlay; keep its Context/Task/Plan inner switch.
- `ProjectSwitcher`, `ProjectPicker`, `AddTabMenu` → `_ui/Popover` (trigger = their existing button; content = their existing list); drop the `useState(open)` + `mousedown` listener + `absolute` panel in each.
- `ContextBar` importers (`ContextTab`, `AgentRow`, `OrchestratorTree`) → import from `@/components/_ui/ContextBar`.
- `InlineImage` consumers → use `useImageDataUrl` and pass `src`.

## ARIA (the `aria-requirements` skill)

- Radix Dialog/Popover/Progress supply roles, `aria-modal`, focus management, Esc, and keyboard nav. Don't re-add them by hand.
- **Icon-only triggers** (the `+` in AddTabMenu/ProjectPicker, the hamburger, close buttons) keep/gain an `aria-label` or `title`.
- Progress: pass `value`/`max` so Radix emits `aria-valuenow`.
- After the consolidation, a **dedicated `accessibility-auditor` pass** sweeps the rest of `_ui/` + components for remaining `jsx-a11y` smells (icon buttons without names, static-element handlers).

## Dependencies

Add `@radix-ui/react-dialog`, `@radix-ui/react-popover`, `@radix-ui/react-progress` (install with `npm install --legacy-peer-deps`). These are pure-JS (no native modules) — consistent with the existing Radix usage; the sql.js "no native modules" rule is unaffected.

## Out of scope / follow-ups

- **`_ui/Tabs` rewrap over `@radix-ui/react-tabs`** — deferred to the backlog (it works and already carries ARIA; rewrapping is risk for marginal gain).
- **`EditField` `<select>` → Radix Select**, **`ResizeHandle` → Separator** — "watch, not yet" (low value / drag handle Radix Separator won't cover).
- **Dead-code cleanup** — run `dead-code-sweeper` AFTER merge (the moved `ContextBar`, removed overlay code, and any orphaned helpers).

## Testing

- TDD where natural: `_ui/Dialog` (renders children when `open`, calls `onOpenChange(false)` on Esc/overlay) and `_ui/Popover` (opens on trigger, closes on outside-click) via RTL. `ContextBar` keeps a light render test.
- Everything else: `tsc` 0, `lint` 0/0 (the a11y rules will catch missing labels), full `vitest` green, `electron-vite build` exit 0. Manual: modals/drawer/dropdowns/usage-bars look and behave as before.
