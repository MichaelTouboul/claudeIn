# Migrating `claude-agent-manager` to the new ClaudeIn design

Your app is **fully tokenized** — every color/font goes through a CSS variable in
`src/index.css` (Tailwind 4 `@theme`). So the migration is mostly a **values
swap**, not a rewrite.

## Step 1 — Re-skin everything (5 minutes, ~0 component edits)

Copy **`migration/index.css`** from this design system over your
**`src/index.css`**. It keeps every token *name* identical and only changes the
*values* (refined-dark surfaces, indigo accent, Geist fonts) plus:
- retires the noise grain (`.surface-grain` becomes a safe no-op),
- neutralizes the cyan `glow-*` utilities,
- brightens the agent identity hues for AA.

```bash
# from the repo root, on a fresh branch / worktree
cp <this-system>/migration/index.css src/index.css
npm run dev   # the whole UI re-skins immediately
```

That alone gives ~80% of the redesign: surfaces, text tiers, accent, borders,
fonts, status colors — across Home, Dashboard, Onboarding and Customize — because
your components already read these tokens.

## Step 2 — Optional polish (where the look is hard-coded, not tokenized)

A handful of spots in the source bypass tokens. Tighten these to match the kits:

1. **Hard-coded cyan rgba** — search the codebase for `6, 182, 212` /
   `rgba(6,182,212` (e.g. `Header.tsx`'s Chat button border, `index.css`
   selection). Replace with `129, 140, 248` (indigo) or a token.
2. **Badge colors** — `_ui/Badge/Badge.tsx` has a literal `COLOR_MAP` of hexes.
   Swap its values for the ones in this system's `tokens/colors.css`
   (`--agent-*`, `--success`, etc.) or point them at the new tokens.
3. **Mono labels → sentence case.** The original sets UI labels in mono +
   lowercase ("you", "agent", "tool", `ZoneHeader`/`TierLabel` overlines). The
   refresh uses **Geist sans, sentence case**; mono is reserved for code/data.
   Update the role labels in `AgentChat/MessageRow/MessageRow.tsx` and the
   uppercase overlines (these are cosmetic, low-risk).
4. **Comfortable density.** Controls were 24–32px (`Button.tsx` `h-6`/`h-8`).
   Bump the default to ~36px if you want the roomier feel from the kits.
5. **Language.** The header still mixes FR/EN ("Accueil"). The new copy is
   English throughout — rename when convenient.

None of step 2 is required for the re-skin to look good; do it incrementally.

## Step 3 — Reference, don't guess

- The four screens in `ui_kits/` are the visual target — open them side-by-side
  while you tweak.
- `readme.md` → **Visual Foundations** + **Content Fundamentals** are the rules.
- New shared primitives (Button, Input, Badge, Card, Tabs, Dialog, …) live in
  `components/` if you'd rather adopt them than retrofit `_ui/`.

## Notes

- **Fonts:** this uses Geist / Geist Mono from Google Fonts. To self-host (no
  network at runtime), drop the woff2 files in and replace the `@import` line
  with `@font-face` rules.
- **Worktrees:** do the swap on its own branch/worktree and merge after the
  in-flight work lands — `src/index.css` is the only file that conflicts, and
  it's a wholesale replace.
- **Accent caveat:** your Button uses one `--color-accent` token for both fills
  and text, so I chose `#818cf8` (works in both roles). If you want the punchier
  solid-indigo button from the kits (`#4f5dd9` fill + white text), add a second
  token `--color-accent-solid` and point `Button.tsx`'s `primary` variant at it.
