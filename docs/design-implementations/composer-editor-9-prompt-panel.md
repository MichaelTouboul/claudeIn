# Card #9 — block 3: "Éditeur de prompt (workspace)" panel

Implements the deferred third block of ClaudeIn Design System card #9. The chat
composer's maximize button now OPENS a real prompt-editor panel in the right
utility sidebar instead of the old invisible inline `max-h` toggle.

## What shipped

- A new panel kind `PanelTabKind.PromptEditor` (`'prompt-editor'`) in
  `usePanelStore`, with a `PromptEditorPayload = { composerId, text }`, a
  `promptEditorTabId(composerId)` identity helper, and `update` support so the
  draft is patched in place (close/reopen preserves it).
- `PromptEditorTab` body (`UtilityPanel/PromptEditorTab/`): a format toolbar, a
  markdown editing area, and a footer with a live word/char count + Enregistrer /
  Envoyer. Reproduces the design's `.wk-toolbar` / `.wk-body` / `.wk-foot`
  structure with project tokens (`--color-surface-2`, `--color-border-subtle`,
  `--color-accent-text`, `--color-accent-subtle`, `--font-mono`, …).
- `useComposerBridgeStore`: the cross-tree channel (see below).
- `RichEditor` gained a `setMarkdown(markdown)` handle method (re-parses markdown
  into Lexical nodes) so the panel can write a draft back into the composer.

## Sync mechanism (Save / Send)

The panel renders OUTSIDE the `AgentChat` subtree, so it can't reach the
composer by props. A small `useComposerBridgeStore` (zustand) bridges them,
keyed by `composerId` (= the chat's stable `conversationKey`):

- `AgentChat` registers `{ setInput, send }` once per composerId.
  `setInput(markdown)` calls `editorRef.setMarkdown(markdown)` — which fires the
  editor's `onChange`, updating the composer's `input`/`plainText` state, so a
  single write keeps editor + state in sync. `send()` forwards to the latest
  `handleSend` via a ref (the closure is rebuilt each render; the registration is
  not).
- **Enregistrer (Save):** `bridge.save(composerId, text)` → `setInput(text)`.
  Writes the draft into the composer WITHOUT sending; the panel stays open.
- **Envoyer (Send):** `bridge.send(composerId, text)` → `setInput(text)` then,
  deferred one tick (so the input state lands before send reads it), fires the
  composer's own `handleSend`. The panel closes on send.
- The draft lives in the panel payload and is patched on every keystroke via
  `usePanelStore.update`, so re-opening the same composer's editor restores the
  in-flight draft. The maximize button seeds the panel from the composer's
  current `input` and reflects/toggles whether the panel currently shows THIS
  composer's editor (active state + Collapse affordance).

## Format toolbar

Bold / Italic / Heading / List / Ordered-list / Code are real markdown
transforms (`markdownFormat.ts`, a pure `PromptFormat`→formatter map — enum +
behavior table, no fallback chain): wrap-the-selection for inline marks,
line-prefix for block marks. The toolbar operates on the markdown the composer
consumes, so no contentEditable/`execCommand` fragility. Word/char count is
computed live from the body text.

## Stubbed affordances / follow-ups

- **Lien:** inserts a minimal markdown link `[label](url)` around the selection
  (placeholder `url`). Not a full URL-picker dialog — a reasonable follow-up.
- **Insérer un agent:** appends an `@` to the body so the user can type a mention
  by hand. A proper agent-picker popover (mirroring the composer's `@` mention
  menu) is the intended follow-up.
- The panel reuses the generic `UtilityPanel` chrome (title + close) rather than
  re-implementing the design's in-card header (accent file icon + Réduire +
  Fermer). The Réduire/Fermer both map to closing the panel; reproducing the
  accent file-icon header inside the card is a cosmetic follow-up.
