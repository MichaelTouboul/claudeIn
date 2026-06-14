# TOON converter — design spec

**Date:** 2026-06-14
**Status:** Approved (ready for implementation)

## Goal

A powerful, integrated **TOON (Token-Oriented Object Notation)** converter that beats Claude
Desktop on structured-data input. When the user pastes substantial JSON into the chat
composer, the app immediately recognizes it, does **not** dump the raw blob into the input,
auto-converts it to TOON, shows how many tokens that saved, and sends the compact TOON to
Claude — keeping the transcript clean.

## Decisions (locked)

- **Token count:** bundled pure-JS tokenizer (`gpt-tokenizer`, o200k_base) in the renderer.
  Labeled `≈` — it is **not** Claude's exact tokenizer (the app uses `claude --print` /
  subscription auth, so Anthropic's count-tokens API is unavailable offline).
- **Conversion trigger:** **auto on paste.** The chip shows TOON + tokens saved immediately;
  the right panel is for review / edit / revert.
- **Detection threshold:** **substantial JSON only** — valid JSON object/array AND (multiline
  OR ≥ ~200 chars). Tiny snippets like `{"a":1}` stay inline text.

## Flow

```
Paste substantial JSON → RichEditor intercepts (NOT inserted as text)
  → useToonStore creates an attachment, encodes TOON, counts tokens (≈)
     send-format defaults to whichever is SMALLER (honest)
  → composer chip: "▤ TOON · ≈1,240 tokens saved ✓"  (hover → [edit] [✕])
  → edit → right UtilityPanel "TOON" tab: JSON (read-only) | TOON | token delta
           + toggle send-format JSON⇄TOON · re-convert · revert
  → send → outgoing prompt gets the chosen format inside a ```toon fence
  → Claude receives compact TOON; the sent user message renders a compact chip,
    not the raw blob ("TOON · ≈112 tokens ✓")
```

## Units (each isolated + testable)

1. **Deps** — `@toon-format/toon` (encode/decode) + `gpt-tokenizer`. Verify exact package
   names via npm/context7 at impl time. Both pure JS, bundled in the renderer (no IPC).
2. **`src/lib/utils/`** (flat files, re-exported via the utils barrel):
   - `detectJson(text): { value: unknown; substantial: boolean } | null`
   - `encodeToon(value: unknown): string`
   - `estimateTokens(text: string): number`
   - `tokenDelta(before: string, after: string): { before: number; after: number; saved: number; pct: number }`
3. **`src/lib/types/toon.types.ts`** (barrel): `JsonAttachment { id; composerId; sourceJson;
   toon; format; jsonTokens; toonTokens }`; `AttachmentFormat` as-const enum (`Json`/`Toon`).
4. **`src/store/useToonStore.ts`** (zustand — changes often, read by composer AND panel,
   survives panel unmount → fits the state decision tree): `attachments: Record<id, JsonAttachment>`,
   `add`, `remove`, `update`, `byComposer(composerId)`, `editingId`, `setEditing`, `clearComposer`.
   Selector-based usage only.
5. **`RichEditor`** — add an `onPasteText(text: string): boolean` seam (Lexical `PASTE_COMMAND`).
   Returning `true` → `preventDefault`, do not insert.
6. **`AgentChatInput/JsonChip/`** — the chip + hover edit/delete badges. Mirror the existing
   attached-file chip hover pattern; neutral/accent design tokens only. `composerId` = chat tab id.
7. **`UtilityPanel/ToonTab/`** — add `PanelTabKind.Toon` + `ToonPayload { attachmentId }` +
   `TAB_BODY` entry + `toonTabId`. Body reads the attachment by id from `useToonStore`; shows
   JSON (read-only mono), TOON output, a token-delta bar, and controls (toggle send-format,
   re-convert, revert). Edits write back to the store; the chip updates reactively.
8. **AgentChat send path** — inline each attachment's chosen format in a ```toon (or ```json)
   fence into the outgoing prompt, then `clearComposer(composerId)`.
9. **`decideUserContent` + `ToonMessageChip`** — detect the ```toon fence in a sent user
   message → render a compact chip instead of the blob (like `SlashCommandMessage`).

## Safety / edge cases

- Invalid JSON or non-substantial JSON → normal paste, untouched.
- Encode/decode/tokenizer failure → fall back to sending raw JSON; never lose user data.
- TOON only saves on uniform/tabular data. If `saved ≤ 0`, default send-format stays JSON and
  the chip says so. Always show the real delta.
- Token count is `≈` — surface that label in the UI.

## Conventions

Follow root + `src/CLAUDE.md`: no `any`, 300-line file limit (split per the front targets),
tests in `__tests__/` (mirror tree for components), `@/` alias, named imports, design tokens
only (no raw color/px — add semantic tokens to `index.css` if needed), enum + behavior-map
(no fallback chains), zustand selector-based.

## Testing

Unit: detect/encode/estimate/delta. Store: add/remove/update/byComposer/clearComposer.
Component: RichEditor paste-intercept, `decideUserContent` toon-detection, `ToonTab` render,
`JsonChip` hover actions. All in `__tests__/`.

## Gate

`npm run typecheck` (0) · `npm run lint` (0/0) · `npx electron-vite build` · `npm test` (all pass).
