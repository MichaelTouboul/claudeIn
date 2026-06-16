# ClaudeIn Design System

A refined, accessible dark-theme design system for **ClaudeIn** — an Electron desktop
companion that makes day-to-day **Claude Code** usage faster, clearer, and more pleasant.

This system is a deliberate redesign of the original app's near-black "terminal" UI.
The brief, from the product owner:

> *"The current design isn't pleasant at all. I want something cleaner, simpler, more
> modern. A lot of things are hard to see, and I'm not sure the colors meet accessibility
> standards."*

So the system keeps ClaudeIn's developer-tool soul but fixes the real problems:

| Was | Now |
| --- | --- |
| Pure near-black surfaces (`#06080c`) | Soft blue-charcoal ladder (`#14161b` → `#2b2f39`) |
| Electric cyan accent, low contrast on dark | Calm developer-tool **indigo**, AA-verified |
| 11px muted-gray labels, lots of low-contrast text | 14px body base, three text tiers all ≥ 4.5:1 |
| Heavy mono everywhere + lowercase "terminal" labels | **Geist** for UI, **Geist Mono** for code/data only |
| Cyan "glow" box-shadows, noise grain | Honest neutral elevation; borders do the separating |
| Compact density | Comfortable density (36px default controls) |

**Accessibility bar:** WCAG 2.1 **AA** — 4.5:1 for body text, 3:1 for large text and for
control outlines that are the only affordance (1.4.11). Every token pairing in this repo was
chosen against that bar.

---

## Sources

This system was reverse-engineered from the product's own codebase (read-only):

- **Codebase:** `claude-agent-manager/` (Electron + React 19 + Tailwind 4 renderer).
  - Design tokens read from `src/index.css` and `src/CLAUDE.md` (design-system section).
  - UI vocabulary read from `src/components/` (the `_ui/` primitives + per-page feature
    components) and `src/pages/` (`Onboarding`, `Home`, `Dashboard`, `Customize`).
  - Product mission & pillars from the root `CLAUDE.md`.
  - Original logo concept: `docs/brand/logo-concept.svg`.

The product surfaces recreated as UI kits live in `ui_kits/` (Home, Dashboard, Onboarding,
Customize). They are cosmetic recreations for design reference — not the production code.

> ℹ️ **Note for the team:** worktrees were in flight when this was built. This system only
> *read* the codebase; it touches no branch. If the live UI changes meaningfully after those
> merge, re-sync the affected kits.

---

## Product context

ClaudeIn is a GUI companion to the Claude Code CLI. Its mission is *"everything the CLI makes
tedious or invisible, this app makes effortless and visible."* Five pillars drive it:

1. **UX beyond the terminal** — a real chat surface (copy/paste, image rendering, syntax-highlighted code & diffs, persistent scrollback).
2. **Visualize the Claude Code ecosystem** — memories (`CLAUDE.md`), sub-agents, skills, MCP servers, hooks, settings — browsable & editable.
3. **Multi-project dashboards** — run and watch several projects/sessions at once.
4. **In-app task management** — drive work from a ticket inside the app.
5. **Automatic context optimization** — curate and shrink the context window *for* the user.

Everything is **local-first** — no data leaves the user's machine. This earnest, private,
developer-respecting tone shapes the copy.

---

## CONTENT FUNDAMENTALS

How ClaudeIn writes.

- **Voice:** calm, precise, and quietly expert. It's a power tool for developers — it never
  over-explains, never hypes, never cutesy. Think of a thoughtful senior engineer's tooltips.
- **Person:** address the user as **you** ("None of your data leaves your machine"). The app
  refers to itself as **ClaudeIn** in onboarding/marketing, and simply acts elsewhere (no "I").
- **Casing:** **Sentence case** everywhere — buttons ("Get started", "Customize Claude"),
  titles ("Welcome to ClaudeIn", "My profile"), headings. The only uppercase is the small
  **overline / section label** (`Favorite repositories`, `Actions`) set in `--tracking-caps`.
  > The original used lowercase mono labels ("you", "agent", "tool"). The refresh retires
  > those in the UI chrome; lowercase is now reserved for literal machine output (a tool name
  > as emitted, a branch name, a file path).
- **Length:** terse. Buttons are 1–2 words. Descriptions are one sentence. Empty states are a
  short title + one supporting line. Prefer a verb ("Add one to find it here").
- **Numbers & machine text:** always in **Geist Mono** with `tabular-nums` — costs (`$0.48`),
  token counts (`12,480`), session IDs, file paths, branch names, model names.
- **Status words:** lowercase machine states get a colored **Badge** (`running`, `idle`,
  `error`, `auth`, `sub-agent`, `memory`). Human-facing labels are sentence case.
- **Emoji:** **none** in product UI. (Occasional functional unicode glyphs are fine — a chevron
  `▾`, a separating `·` — but never decorative emoji.)
- **Examples to copy:**
  - CTA: `Get started` · `New session` · `Customize Claude` · `Add repository`
  - Empty: *"No favorite repositories yet. Add one to find it here."*
  - Reassurance: *"None of your data leaves your machine."*
  - Soon: append ` · soon` in tertiary text to a disabled control.

---

## VISUAL FOUNDATIONS

The look, exhaustively.

### Surfaces & background
A **5-step elevation ladder** of cool blue-charcoal — `--surface-base` (`#14161b`, the app
canvas) up through `--surface-3` (`#2b2f39`, popovers/hover), plus `--surface-inset`
(`#0f1115`) for code wells and input fills. **No** full-bleed imagery, **no** gradients on
backgrounds, **no** noise/grain texture (the original's grain was removed). Backgrounds are
flat, calm, matte. Depth is communicated by surface step + border, not color temperature.

### Color
One accent only: a **calm indigo** (`--accent-solid #4f5dd9` for fills with white text;
`--accent-text #a3adff` for links/icons on dark). Status hues (success green, warning amber,
danger red, info blue, history purple) are reserved for genuine semantic meaning. Eight
**agent identity hues** tint avatars/dots/chips when distinguishing concurrent agents. Imagery,
where present, is incidental (user avatars) — the palette itself is cool and restrained, never
warm or saturated.

### Typography
**Geist** (UI) + **Geist Mono** (code/data). Body base **14px / 21px** line-height. Headings
use `--tracking-tight` (`-0.01em`); the uppercase overline uses `--tracking-caps` (`0.08em`).
Weights 400/500/600/700. Mono is reserved strictly for machine text.

### Spacing & layout
**4px base grid.** Comfortable density: 36px default control height, generous 16–24px section
gaps. App shell is fixed (no page scroll) — `Header` · `Workspace` · `Footer`; only inner panes
scroll. Sidebar 264px, header 52px, content max ~960px. Layout uses flex/grid + `gap`, never
margins on children.

### Borders, radii & cards
Hairline borders carry most separation: `--border-subtle` (dividers), `--border` (default),
`--border-strong` (3:1 control outlines). Radii: **8px** controls, **12px** cards/panels, pill
for badges/toggles. A **Card** is `--surface-2` + 1px `--border` + 12px radius + a *very* soft
`--shadow-xs`; selected cards swap to `--accent-border`; interactive cards lift 1px and deepen
to `--shadow-md` on hover.

### Elevation & shadows
Honest neutral depth, **no colored glow**. `--shadow-xs/sm` for resting cards, `--shadow-md`
for popovers/menus, `--shadow-dialog` for modals. A near-invisible `--highlight-top` inset can
add a 1px top sheen on raised cards.

### Motion
Calm and quick. Enters fade + translate 4px over `--duration-base` (200ms) on `--ease-out`.
Hover/active transitions run 140ms on `--ease-standard`. **No bounce, no infinite decorative
loops** on content (the live `StatusDot` pulse and indeterminate progress are the only loops,
both meaningful). All motion respects `prefers-reduced-motion`.

### Interaction states
- **Hover:** quiet background fill step-up (`transparent → --surface-2 → --surface-3`) and/or
  text `tertiary → primary`. Primary buttons brighten ~8%.
- **Active/press:** primary deepens to `--accent-active`; no shrink by default (subtle scale
  token `--press-scale` available if wanted).
- **Focus:** always-visible 2px `--focus-ring` (`--accent-text`) at 2px offset for keyboard
  users (`:focus-visible`); inputs additionally show a 3px `--accent-subtle` ring.
- **Selected:** `--accent-subtle` fill + `--accent-text` foreground (tags, menu, nav).
- **Disabled:** 50% opacity, `not-allowed` cursor.

### Transparency & blur
Used sparingly: the modal scrim is `--surface-overlay` (semi-opaque near-black) with a light
2px backdrop blur. Tinted backgrounds (`--accent-subtle`, `--*-subtle`) are translucent so they
sit naturally on any surface step. No frosted-glass panels in the main chrome.

---

## ICONOGRAPHY

- **System:** **[Lucide](https://lucide.dev)** — the icon set the source app already uses
  (`import { Home, MessageSquare, Activity, Bot, Shield, Wrench, ChevronRight } from 'lucide-react'`).
  Clean, consistent **1.5–2px stroke**, rounded caps/joins, 24×24 grid. This matches the system's
  rounded, calm geometry.
- **Usage in this system:** the UI kits load Lucide from CDN (`lucide@latest`) and render icons
  at **16px** (inline/controls) or **14px** (dense rows), `stroke-width: 1.75`, colored with
  `currentColor` so they inherit text color (`--text-tertiary` at rest, `--text-primary`/
  `--accent-text` when active). Specimen cards use small hand-inlined SVGs in the same Lucide
  idiom to avoid a CDN dependency.
- **Stroke & fill:** stroked, never filled. Icon color follows the adjacent label's tier.
- **The logo** is a custom mark (not Lucide): a refined prompt-chevron `›` + cursor, in
  `assets/`. See **Brand** cards.
- **Emoji / unicode:** no decorative emoji. Functional glyphs only (`▾` select chevron, `·`
  separator, `×` remove).

---

## Index / manifest

**Foundations**
- `styles.css` — the one file consumers link. `@import`s every token file below.
- `tokens/colors.css` · `typography.css` · `spacing.css` · `elevation.css` · `motion.css` ·
  `fonts.css` (Geist + Geist Mono via Google Fonts) · `base.css` (resets, focus, scrollbars,
  keyframes, helper classes).
- `guidelines/*.card.html` — Design System tab specimen cards (Colors, Type, Spacing, Brand).

**Components** (`components/<group>/` — React, consumed via `window.ClaudeInDesignSystem_<hash>`)
- `forms/` — **Button, IconButton, Input, Textarea, Select, Checkbox, Switch**
- `display/` — **Card, Badge, Tag, StatusDot, Avatar, Kbd**
- `feedback/` — **Spinner, ProgressBar, Banner, Tooltip, EmptyState**
- `navigation/` — **Tabs, SegmentedControl**
- `overlay/` — **Dialog, Menu**
- `components/lib/useInteractive.js` — shared hover/focus/active hook (internal).

**UI kits** (`ui_kits/<product>/` — full clickable screen recreations)
- `home/` · `dashboard/` · `onboarding/` · `customize/`

**Other**
- `assets/` — `claudein-mark.svg`, `claudein-icon.svg`, `claudein-icon-mono.svg`,
  `claudein-favicon.svg`, `claudein-wordmark.svg`.
- `SKILL.md` — Agent-Skill manifest so this system works inside Claude Code.

> The compiler regenerates `_ds_bundle.js`, `_ds_manifest.json`, `_adherence.oxlintrc.json`
> automatically — never edit those by hand.
