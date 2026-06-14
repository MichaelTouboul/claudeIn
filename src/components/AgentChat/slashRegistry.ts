import type { ImproveContextTarget } from '@/lib/types';

// The single source of truth for slash commands — drives BOTH the autocomplete
// menu (`SLASH_COMMANDS`) AND dispatch (`dispatchSlashCommand`). A command's
// `kind` declares how it is handled; there is no scattered `if (cmd === …)`
// special-casing anywhere. Adding a native command = one entry here + (for a
// local one) a matching handler in `LocalSlashHandlers`.

// `kind` is a finite state that drives behavior, so it is modeled as an
// `as const` object + value→behavior map (NOT a fallback chain), per CLAUDE.md.
export const SlashCommandKind = {
  // Handled in-app, never forwarded to `claude` (e.g. `/clear`).
  Local: 'local',
  // Forwarded to `claude` as a message — the default for native CLI commands.
  Cli: 'cli',
  // Opens an in-app picker submenu (e.g. `/model`) instead of running anything;
  // the choice writes per-conversation state consumed by the next spawn.
  Model: 'model',
  // Opens an in-app screen (e.g. `/agents`, `/skills`) — the command carries a
  // `view` target; the caller supplies the open function (the `openView` dep),
  // same injected-handler pattern as `local` commands. Never forwarded to claude.
  View: 'view',
  // Opens the Self-Improve modal (`/improve`, `/feature-request`) with NO
  // component target — a general improvement request. The caller supplies the
  // open function (`openImprove`). Never forwarded to claude.
  Improve: 'improve',
} as const;
export type SlashCommandKind = (typeof SlashCommandKind)[keyof typeof SlashCommandKind];

// Which app screen a `view` command opens. The caller's `openView` maps each
// target to its real open mechanism (sidebar agents/skills panel today).
export type SlashViewTarget = 'agents' | 'skills';

// The id of an in-app handler a local command binds to. The registry stays pure
// data (no React closures); the caller supplies the actual functions at dispatch
// time via `LocalSlashHandlers`, keyed by this id.
export type LocalSlashHandlerId = 'clear';

export type LocalSlashHandlers = Record<LocalSlashHandlerId, () => void>;

type LocalSlashCommand = { cmd: string; desc: string; kind: typeof SlashCommandKind.Local; handler: LocalSlashHandlerId };
type CliSlashCommand = { cmd: string; desc: string; kind: typeof SlashCommandKind.Cli };
type ModelSlashCommand = { cmd: string; desc: string; kind: typeof SlashCommandKind.Model };
type ViewSlashCommand = { cmd: string; desc: string; kind: typeof SlashCommandKind.View; view: SlashViewTarget };
type ImproveSlashCommand = { cmd: string; desc: string; kind: typeof SlashCommandKind.Improve };
export type SlashCommand =
  | LocalSlashCommand
  | CliSlashCommand
  | ModelSlashCommand
  | ViewSlashCommand
  | ImproveSlashCommand;

// v1 HONESTY PASS: every entry here works through `claude --print` or opens a
// real app view. Dead interactive-TUI placeholders (`/vim`, `/config`, `/login`,
// …) and not-yet-viewable commands (`/mcp`, `/memory`, `/cost`, `/help`, …) were
// REMOVED — they are tracked in `docs/feature-requests-no-mvp.md` for future
// versions. See `docs/superpowers/specs/2026-06-08-native-slash-commands-v1-design.md`.
// `/compact` is genuinely effective under `--print`: the CLI emits a
// `compact_boundary` system event (handled in `electron/services/spawn.service.ts`)
// that rewrites the context window — so it stays a real `cli` command.
export const SLASH_COMMANDS: SlashCommand[] = [
  { cmd: '/clear', desc: 'Clear conversation history', kind: SlashCommandKind.Local, handler: 'clear' },
  { cmd: '/compact', desc: 'Compact conversation context', kind: SlashCommandKind.Cli },
  { cmd: '/model', desc: 'Switch model', kind: SlashCommandKind.Model },
  { cmd: '/agents', desc: 'Browse sub-agents', kind: SlashCommandKind.View, view: 'agents' },
  { cmd: '/skills', desc: 'Browse skills', kind: SlashCommandKind.View, view: 'skills' },
  { cmd: '/improve', desc: 'Request an improvement to the app', kind: SlashCommandKind.Improve },
  { cmd: '/feature-request', desc: 'Request an improvement to the app', kind: SlashCommandKind.Improve },
];

const BY_CMD: Record<string, SlashCommand> = Object.fromEntries(
  SLASH_COMMANDS.map((c) => [c.cmd, c]),
);

/** Look up a registered command by its exact `/cmd` token, or `undefined`. */
export function findSlashCommand(cmd: string): SlashCommand | undefined {
  return BY_CMD[cmd];
}

export type DispatchDeps = {
  handlers: LocalSlashHandlers;
  // Forward a `cli` command (or unknown text the caller chose to send) to claude.
  sendToCli: (text: string) => void;
  // Open the in-app model picker submenu (the `model` kind). The caller owns the
  // menu mechanism (same pattern as `handlers` for local commands).
  openModelPicker: () => void;
  // Open the in-app screen a `view` command targets (e.g. agents/skills panel).
  // The caller owns the open mechanism (same injected-handler pattern).
  openView: (view: SlashViewTarget) => void;
  // Open the Self-Improve modal with NO component target (general request) for
  // `/improve` / `/feature-request`. The caller owns the open mechanism.
  openImprove: (target: ImproveContextTarget | null) => void;
};

// Per-kind behavior, keyed by the finite `kind` — no `if (cmd === …)` chains.
const KIND_BEHAVIOR: Record<SlashCommandKind, (cmd: SlashCommand, deps: DispatchDeps) => void> = {
  [SlashCommandKind.Local]: (cmd, deps) => {
    // Only a LocalSlashCommand reaches here (its kind is Local), so `handler` exists.
    deps.handlers[(cmd as LocalSlashCommand).handler]();
  },
  [SlashCommandKind.Cli]: (cmd, deps) => {
    deps.sendToCli(cmd.cmd);
  },
  [SlashCommandKind.Model]: (_cmd, deps) => {
    deps.openModelPicker();
  },
  [SlashCommandKind.View]: (cmd, deps) => {
    // Only a ViewSlashCommand reaches here (its kind is View), so `view` exists.
    deps.openView((cmd as ViewSlashCommand).view);
  },
  [SlashCommandKind.Improve]: (_cmd, deps) => {
    // `/improve` is a general request — no component is captured from chat.
    deps.openImprove(null);
  },
};

/**
 * The ONE dispatcher for slash commands. Looks `input` up in the registry and
 * routes by `kind`. Returns `true` when it owned the input (a registered
 * command was handled), `false` when the token is not a registered command so
 * the caller can fall back to a normal message send.
 */
export function dispatchSlashCommand(input: string, deps: DispatchDeps): boolean {
  const entry = findSlashCommand(input.trim());
  if (!entry) return false;
  KIND_BEHAVIOR[entry.kind](entry, deps);
  return true;
}
