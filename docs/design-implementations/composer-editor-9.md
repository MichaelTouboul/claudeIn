# Composer + prompt editor (Dashboard card #9)

Implements the ClaudeIn Design System card `Dashboard / Composer + éditeur de prompt`
(`/tmp/claudein-design/9/_export/composer-editor/`) into the renderer composer
(`src/components/Dashboard/AgentChat/`).

## What the card asked for

1. A row of **active-agent vignettes** — pill chips with a hue-tinted avatar tile,
   a green live dot when the agent is running, the agent name, and an inline `×`.
2. An **épuré composer** — the inline format toolbar removed; a chevron, an
   auto-growing textarea, and a tools row (prompt-editor button, attach, send).
3. A richer **prompt editor** for drafting long prompts before sending.

## What shipped

### Active-agent vignettes (`AgentTabs` → `AgentVignette`)
The existing sub-agent presence row (`AgentTabs`) was redesigned in place into the
card's vignettes. Each agent renders as `AgentVignette`: a pill with a hue-tinted
`Bot` avatar tile (hue from the agent's identity color via the `.agent-color-*`
class → `--agent-color`), a pulsing `--color-active` live dot **only** while the
agent is active, the name, and an inline `×`. The row gains the card's `Active:`
label. All prior behavior is preserved: clicking a vignette opens the agent's live
panel, the `×` cosmetically dismisses it (reappears on a strictly-newer event), and
the session-overview control opens the workflow panel.

- **Live state** is driven by the existing authoritative enum + behavior map
  (`CONVERSATION_AGENT_DOT[status].pulse`) — no fallback chain.

### Épuré composer (`AgentChatInput`, `RichEditor`)
- The inline format `Toolbar` (Bold/Code/List/ListOrdered) was **removed** from
  `RichEditor` and the orphaned `Toolbar.tsx` deleted. Markdown shortcuts still
  work in the editor; explicit format buttons belong to the prompt editor surface
  (see assumption below).
- The tools row now groups: **prompt-editor toggle** (Maximize/Minimize), **attach**,
  **send** — matching the card's `tools` cluster.

### Prompt editor (assumption — reasonable in-place version)
The card shows a full workspace prompt editor (its own panel with a formatting
toolbar, word/char count, save/send). That is a substantial new surface with its
own docking + persistence model, and where it docks was ambiguous. **Implemented
reasonable version:** the prompt-editor button toggles an **expanded** in-place
editor (`RichEditor expanded` → larger max-height, 120px → 360px) so a long prompt
is comfortable to draft in the composer itself. The button flips between
`Open prompt editor` / `Collapse prompt editor`.

## Assumptions / follow-ups for the orchestrator
- **Full workspace prompt editor (deferred):** a dedicated right-panel rich-text
  editor with its own format toolbar, word/char count, and Save/Send footer (the
  card's third block) is **not** built here — it needs a panel/store/persistence
  decision. The composer exposes the affordance (the maximize button) and a
  documented in-place expand as the interim behavior. Wiring the button to a real
  panel is the natural next step.
- **Copy language:** the card's mockup is in French; the shipped app is English
  (placeholders, aria-labels). Labels were kept **English** (`Active:`,
  `Open prompt editor`) to avoid mixing languages in a shipped surface — the visual
  structure and tokens follow the card faithfully.
