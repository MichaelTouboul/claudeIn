---
name: claudein-design
description: Use this skill to generate well-branded interfaces and assets for ClaudeIn, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping. ClaudeIn is a calm, accessible, refined-dark desktop companion for Claude Code.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick orientation

- **`readme.md`** — the full design guide: product context, content fundamentals, visual foundations, iconography, and a file index. Read this first.
- **`styles.css`** — the single stylesheet to link. It `@import`s every token file in `tokens/` (colors, typography, spacing, elevation, motion, fonts, base). Link it and you have the whole token system + `@font-face`s (Geist, Geist Mono) + helper classes (`.overline`, `.mono`, `.ci-fade-in`, …).
- **`tokens/`** — CSS custom properties. Always reference a semantic token (`--surface-1`, `--text-primary`, `--accent-solid`, `--border-strong`) rather than a raw hex. Every text/surface pairing meets WCAG AA.
- **`components/`** — React primitives (Button, Input, Badge, Card, Tabs, Dialog, …), one `<Name>.jsx` + `<Name>.d.ts` per file. In a compiled-bundle context they live on `window.<Namespace>` (see the component cards for the exact destructure); in source, import the `.jsx` directly.
- **`guidelines/*.card.html`** — foundation specimens (color, type, spacing, brand) you can open to see tokens in use.
- **`ui_kits/<product>/`** — full screen recreations (home, dashboard, onboarding, customize). Each is a self-contained `index.html` + `icons.jsx`. Copy one as a starting point for a new screen.
- **`assets/`** — the logo: `claudein-mark.svg` (bare prompt-chevron `>_`), `claudein-icon.svg` (gradient app-icon tile), `claudein-icon-mono.svg` (flat monochrome tile), `claudein-favicon.svg`, `claudein-wordmark.svg`.

## House rules (the short version)

- **Refined dark only.** Soft blue-charcoal surfaces, never pure black. One accent: calm indigo.
- **Geist for UI, Geist Mono for code/data** (paths, IDs, counts, diffs) — nothing else in mono.
- **Sentence case** copy; the only uppercase is the small section overline. No emoji. Address the user as "you".
- **Comfortable density**, 4px grid, 36px default controls, generous gaps.
- **Calm motion**, honest neutral elevation (no colored glow), borders do most separation.
- **Icons:** Lucide (1.75 stroke, 24 grid). Use `lucide-react` in production; the kits ship inline Lucide-idiom SVGs in `icons.jsx`.
