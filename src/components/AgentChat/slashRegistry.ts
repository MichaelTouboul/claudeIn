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
} as const;
export type SlashCommandKind = (typeof SlashCommandKind)[keyof typeof SlashCommandKind];

// The id of an in-app handler a local command binds to. The registry stays pure
// data (no React closures); the caller supplies the actual functions at dispatch
// time via `LocalSlashHandlers`, keyed by this id.
export type LocalSlashHandlerId = 'clear';

export type LocalSlashHandlers = Record<LocalSlashHandlerId, () => void>;

type LocalSlashCommand = { cmd: string; desc: string; kind: typeof SlashCommandKind.Local; handler: LocalSlashHandlerId };
type CliSlashCommand = { cmd: string; desc: string; kind: typeof SlashCommandKind.Cli };
type ModelSlashCommand = { cmd: string; desc: string; kind: typeof SlashCommandKind.Model };
export type SlashCommand = LocalSlashCommand | CliSlashCommand | ModelSlashCommand;

export const SLASH_COMMANDS: SlashCommand[] = [
  { cmd: '/help', desc: 'Get help with Claude Code', kind: SlashCommandKind.Cli },
  { cmd: '/init', desc: 'Initialize CLAUDE.md', kind: SlashCommandKind.Cli },
  { cmd: '/review', desc: 'Review a pull request', kind: SlashCommandKind.Cli },
  { cmd: '/compact', desc: 'Compact conversation context', kind: SlashCommandKind.Cli },
  { cmd: '/clear', desc: 'Clear conversation history', kind: SlashCommandKind.Local, handler: 'clear' },
  { cmd: '/config', desc: 'Open settings', kind: SlashCommandKind.Cli },
  { cmd: '/cost', desc: 'Show token/cost usage', kind: SlashCommandKind.Cli },
  { cmd: '/doctor', desc: 'Check Claude Code health', kind: SlashCommandKind.Cli },
  { cmd: '/login', desc: 'Switch account', kind: SlashCommandKind.Cli },
  { cmd: '/logout', desc: 'Sign out', kind: SlashCommandKind.Cli },
  { cmd: '/memory', desc: 'Edit CLAUDE.md', kind: SlashCommandKind.Cli },
  { cmd: '/model', desc: 'Switch model', kind: SlashCommandKind.Model },
  { cmd: '/permissions', desc: 'View allowed tools', kind: SlashCommandKind.Cli },
  { cmd: '/status', desc: 'Show session status', kind: SlashCommandKind.Cli },
  { cmd: '/terminal-setup', desc: 'Install shell integration', kind: SlashCommandKind.Cli },
  { cmd: '/vim', desc: 'Toggle vim mode', kind: SlashCommandKind.Cli },
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
