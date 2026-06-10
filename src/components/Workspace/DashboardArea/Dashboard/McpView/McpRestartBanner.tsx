// Shown after a successful MCP mutation: the CLI writes config but live `claude`
// sessions only re-read MCP servers on (re)start, so there is no live reload.
export function McpRestartBanner() {
  return (
    <div
      role="status"
      data-testid="mcp-restart-banner"
      className="text-xs rounded px-3 py-2"
      style={{
        color: "var(--color-text-primary)",
        backgroundColor: "var(--color-accent-dim)",
        border: "1px solid var(--color-accent)",
        fontFamily: "var(--font-sans)",
      }}
    >
      Restart your Claude sessions to apply
    </div>
  );
}
