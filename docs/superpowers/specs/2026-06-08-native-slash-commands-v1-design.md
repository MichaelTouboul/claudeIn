# Native slash commands — v1 design spec

**Date:** 2026-06-08
**Status:** approved (brainstorm), pending plan
**Topic:** ship one real new native command — **`/model`** (per-conversation model switch) — and make the slash menu **honest**: every entry must work, open an app view, or be removed. Removed commands are tracked in `docs/feature-requests.md` for later versions.

## 1. Context & constraint

The chat runs `claude --print` (one-shot, subscription auth — see [[project-print-vs-sdk-billing]]). Interactive-TUI slash commands (`/vim`, `/config`, `/login`, …) do **not** work through `--print`; sending the literal text does nothing. The current `slashRegistry` lists ~16 commands but only `/clear` has a real handler; the rest are `kind: 'cli'` placeholders forwarded to `--print`, where most are inert. v1 fixes this dishonesty.

Three feasible buckets under `--print`:
1. **App-reimplemented session ops** — `/clear` (done), `/compact` (verify).
2. **Flag-mappable** — `/model` → `claude --print --model <id>`. The spawn passes `--print/--resume/--agent/--append-system-prompt` but **not** `--model` today.
3. **App-view openers** — only `/agents` and `/skills` have real views (`InternalTab` kinds `agent`/`skill`, `useDashboardUIStore.selectAgent/selectSkill`). MCP/memory/config/permissions views are **not built**, so their commands are deferred, not repurposed.

## 2. Decisions (from brainstorm)

| Decision | Choice |
|---|---|
| The one new functional command | **`/model`** — per-conversation model switch |
| `/model` UX | **Picker via `/model`** (a submenu like other slash commands), not a persistent dropdown. Shows the current model. |
| Commands with a real view | `/agents`, `/skills` → a new `kind: 'view'` that opens the app screen |
| Dead placeholders | **Removed from v1** entirely (lean, 100%-functional menu) |
| Removed commands | Tracked in `docs/feature-requests.md` for future versions (not lost) |

### v1 menu — final fate of every entry

| Command | v1 fate |
|---|---|
| `/model` | ✅ NEW functional — picker + `--model` |
| `/clear` | keep (`local`, works) |
| `/compact` | keep (`cli`) — verify it actually compacts via `--print` |
| `/agents` | → `view` (open the agent screen) |
| `/skills` | → `view` (open `SkillDetail`) |
| `/vim` `/doctor` `/terminal-setup` `/login` `/logout` `/status` | REMOVE (no GUI meaning) |
| `/mcp` `/memory` `/config` `/permissions` | REMOVE from v1 → feature-requests (need a view first) |
| `/cost` `/help` `/init` `/review` | REMOVE from v1 → feature-requests (`/cost`, `/help` are easy follow-ups) |

## 3. Architecture

Build on the existing **declarative registry** (`src/components/AgentChat/slashRegistry.ts`): `SlashCommandKind` (`as const`) + a `KIND_BEHAVIOR` `Record<kind, fn>` map — no `if (cmd === …)`. Add **two kinds**:

- **`SlashCommandKind.Model`** — dispatch opens the model picker (reuse the `InputMenu`/`useInputMenus` mechanism). Selecting a model writes it to a small per-conversation store and the picker closes. The next `spawn` passes `--model`.
- **`SlashCommandKind.View`** — a `view` command carries a `view` id; dispatch calls into `useDashboardUIStore`/`useWorkspaceStore` to open that screen (`/agents` → agent view, `/skills` → skill view). Pure data in the registry; the caller supplies the open-handlers (same pattern as `LocalSlashHandlers`).

### `/model` data flow

- **Model ids** (from the environment): Opus 4.8 `claude-opus-4-8`, Sonnet 4.6 `claude-sonnet-4-6`, Haiku 4.5 `claude-haiku-4-5-20251001`. A central `MODELS` list (label + id). No selection = `claude`'s default (omit `--model`).
- **Per-conversation state**: a small zustand `useModelStore` mapping a conversation key (the chat's `localSessionId`, falling back to the tab id) → model id. Selector-based.
- **Spawn wiring** (backend): `spawn` opts gain `model?: string`; `spawn.service.ts` pushes `--model <id>` when present; declare in `preload.ts` + `env.d.ts`. `AgentChat` reads the selected model from `useModelStore` and passes it on every `spawn`/resume call.
- **Current-model indicator**: a discreet label near the input (e.g. in the model picker trigger / placeholder) reading the store.

## 4. Delivery phases (test + commit between each)

1. **`/model` end-to-end.** Backend `--model` (spawn opts → `spawn.service` → preload → `env.d.ts`); `useModelStore` (per-conversation); `AgentChat` passes the model on spawn; registry `Model` kind + the picker submenu in `useInputMenus`/`InputMenu`; current-model indicator. The headline feature.
2. **Registry honesty pass.** Add `View` kind; wire `/agents`, `/skills` to open their views; **remove** all dead entries; verify `/compact` actually compacts (fix or note if not). Append the removed commands to `docs/feature-requests.md` under "Native slash commands (future)".

## 5. Out of scope (v1) → tracked in `docs/feature-requests.md`

`/cost`, `/help`, `/init`, `/review` (functional but deselected); `/mcp`, `/memory`, `/config`, `/permissions` (need a dedicated view first); custom user/project commands (`.claude/commands/*.md`) and skills runner (a separate, larger Pillar-2 feature).

## 6. Conventions

Follows `CLAUDE.md` / `src/CLAUDE.md` and `electron/CLAUDE.md`: no `any`; named imports; 300-line limit; enum + behavior-map for `SlashCommandKind` (already the pattern); zustand selector-based for the per-conversation model; adding a `window.api` method goes service → ipc → preload → `env.d.ts`. Reuses `InputMenu`/`useInputMenus`, `slashRegistry`, `useDashboardUIStore`/`useWorkspaceStore`.
