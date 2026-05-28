export type SlashCommand = { cmd: string; desc: string };

export const SLASH_COMMANDS: SlashCommand[] = [
  { cmd: "/help", desc: "Get help with Claude Code" },
  { cmd: "/init", desc: "Initialize CLAUDE.md" },
  { cmd: "/review", desc: "Review a pull request" },
  { cmd: "/compact", desc: "Compact conversation context" },
  { cmd: "/clear", desc: "Clear conversation history" },
  { cmd: "/config", desc: "Open settings" },
  { cmd: "/cost", desc: "Show token/cost usage" },
  { cmd: "/doctor", desc: "Check Claude Code health" },
  { cmd: "/login", desc: "Switch account" },
  { cmd: "/logout", desc: "Sign out" },
  { cmd: "/memory", desc: "Edit CLAUDE.md" },
  { cmd: "/model", desc: "Switch model" },
  { cmd: "/permissions", desc: "View allowed tools" },
  { cmd: "/status", desc: "Show session status" },
  { cmd: "/terminal-setup", desc: "Install shell integration" },
  { cmd: "/vim", desc: "Toggle vim mode" },
];
