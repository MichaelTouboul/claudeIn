import { RefreshCw } from "lucide-react";

// Shown after a successful MCP mutation: the CLI writes config but live `claude`
// sessions only re-read MCP servers on (re)start, so there is no live reload.
export function McpRestartBanner() {
  return (
    <div
      role="status"
      data-testid="mcp-restart-banner"
      className="flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-xs"
      style={{
        color: "var(--color-text-primary)",
        backgroundColor: "var(--color-accent-dim)",
        border: "1px solid var(--color-accent)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <RefreshCw size={14} className="text-accent shrink-0" aria-hidden="true" />
      Restart your Claude sessions to apply.
    </div>
  );
}
