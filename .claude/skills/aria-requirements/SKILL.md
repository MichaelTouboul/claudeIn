---
name: aria-requirements
description: The project's ARIA / accessibility requirements for React components — roles, accessible names, keyboard operability, and the jsx-a11y rules the lint enforces. Use when writing, reviewing, or fixing interactive UI, or auditing accessibility.
---

# ARIA / accessibility requirements

The renderer enforces accessibility through `eslint-plugin-jsx-a11y` (see `eslint.config.mjs`) at **0 warnings**. This skill states what compliant components look like so you write them right the first time and can audit/fix existing ones.

## Hard rules (lint-enforced — a violation fails the build)

1. **Interactive behaviour belongs on interactive elements.** Don't put `onClick` on a bare `<div>`/`<span>`. Use a real `<button>` (or `<a>` for navigation). This satisfies `no-static-element-interactions` and `click-events-have-key-events`.
2. **If you must make a non-interactive element interactive**, give it BOTH a `role` AND a keyboard handler: `role="button"` + `tabIndex={0}` + `onClick` + `onKeyDown` handling `Enter`/`Space`. (This is the escape hatch used for a close "×" nested inside a `<button>`, where a real nested `<button>` is illegal — see `_ui/Tabs`.)
3. **No tabindex on non-interactive elements** (`no-noninteractive-tabindex`) — only the `separator` and `tabpanel` roles are whitelisted. Don't add `tabIndex` to a plain `div` unless it carries one of those roles.
4. **Every form control has an accessible label** (`label-has-associated-control`): wrap the control in its `<label>`, or use `htmlFor`/`id`, or `aria-label`.
5. **Icon-only buttons need an accessible name** — add `aria-label` or `title` (e.g. the close, hamburger, and `+` buttons). A button whose only child is an SVG icon is invisible to screen readers otherwise.

## Tab / tablist pattern (the project uses it in `_ui/Tabs`)

- The strip is `role="tablist"`; each tab is `role="tab"` with `aria-selected={isActive}`.
- Arrow-key navigation (`ArrowLeft`/`ArrowRight`) moves between tabs.
- A close affordance inside a tab is a sibling `<span role="button" aria-label={`Close ${label}`} tabIndex={0}>` with `onClick` + `onKeyDown` (Enter/Space) and `e.stopPropagation()` — never a `<button>` nested in the tab `<button>`.

## Keyboard operability

- Anything clickable is reachable and operable by keyboard (Tab to focus, Enter/Space to activate).
- Modals/slide-overs close on `Escape` and trap nothing the user can't escape; the backdrop is a labelled button (`aria-label="Close …"`) or has an explicit close control.
- Don't autofocus aggressively as a habit (the `no-autofocus` rule is off, so autofocus is *allowed* where it genuinely helps — e.g. focusing a proposal prompt — but use it deliberately, not by default).

## Design-system note

Accessible names and roles are independent of styling — keep using the CSS-var design system. Adding `aria-*`/`role` never means abandoning the token system.

## When auditing existing code

Grep for the smells: `onClick=` on `div`/`span` without a `role`; icon-only `<button>` with no `aria-label`/`title`; `tabIndex` on non-interactive elements; form inputs with no associated label. Each is a concrete fix from the rules above. Verify fixes with `npm run lint` (must stay 0/0).
