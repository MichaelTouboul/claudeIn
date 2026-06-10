import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { McpServerEntry } from "@/types/mcp-mirror.types";

import { McpView } from "./McpView";

function entry(name: string, overrides: Partial<McpServerEntry> = {}): McpServerEntry {
  return {
    name,
    source: "project-mcp-json",
    scope: "project",
    transport: "stdio",
    target: `cmd ${name}`,
    shadowed: false,
    ...overrides,
  };
}

describe("McpView", () => {
  beforeEach(() => {
    window.api = {
      getMcpRaw: vi.fn(async (name: string) => ({
        name,
        transport: "stdio",
        scope: "project",
        command: "cmd",
      })),
      removeMcpServer: vi.fn(async () => ({ ok: true as const })),
      addMcpServer: vi.fn(async () => ({ ok: true as const })),
      editMcpServer: vi.fn(async () => ({ ok: true as const })),
    } as unknown as Window["api"];
  });

  it("renders one row per server", () => {
    render(<McpView servers={[entry("alpha"), entry("beta", { source: "user-settings" })]} />);
    expect(screen.getAllByTestId("mcp-server-row")).toHaveLength(2);
    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(screen.getByText("beta")).toBeInTheDocument();
  });

  it("renders the empty state when there are no servers", () => {
    render(<McpView servers={[]} />);
    expect(screen.getByText("No MCP servers configured")).toBeInTheDocument();
    expect(screen.queryByTestId("mcp-server-row")).not.toBeInTheDocument();
  });

  it("does not show the restart banner before any mutation", () => {
    render(<McpView servers={[entry("alpha")]} />);
    expect(screen.queryByTestId("mcp-restart-banner")).not.toBeInTheDocument();
  });

  it("shows the restart banner after a successful remove", async () => {
    render(<McpView servers={[entry("alpha")]} />);
    fireEvent.click(screen.getByRole("button", { name: /remove alpha/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^remove$/i }));
    await waitFor(() =>
      expect(screen.getByText("Restart your Claude sessions to apply")).toBeInTheDocument(),
    );
  });

  it("surfaces a CLI error from a failed remove", async () => {
    (window.api.removeMcpServer as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      error: "no such server",
    });
    render(<McpView servers={[entry("alpha")]} />);
    fireEvent.click(screen.getByRole("button", { name: /remove alpha/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^remove$/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("no such server"));
    expect(screen.queryByTestId("mcp-restart-banner")).not.toBeInTheDocument();
  });

  it("the Add MCP server button opens the add dialog", () => {
    render(<McpView servers={[entry("alpha")]} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /add mcp server/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });

  it("adding a server calls addMcpServer, closes the dialog and shows the restart banner", async () => {
    render(<McpView servers={[entry("alpha")]} />);
    fireEvent.click(screen.getByRole("button", { name: /add mcp server/i }));
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "pw" } });
    fireEvent.change(screen.getByLabelText(/command/i), { target: { value: "npx" } });
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));
    await waitFor(() =>
      expect(window.api.addMcpServer).toHaveBeenCalledWith(
        expect.objectContaining({ name: "pw", transport: "stdio", command: "npx" }),
      ),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("Restart your Claude sessions to apply")).toBeInTheDocument();
  });

  it("editing a row prefills from getMcpRaw and submits editMcpServer", async () => {
    render(<McpView servers={[entry("alpha")]} />);
    fireEvent.click(screen.getByRole("button", { name: /edit alpha/i }));
    await waitFor(() => expect(window.api.getMcpRaw).toHaveBeenCalledWith("alpha", "project", undefined));
    await waitFor(() => expect((screen.getByLabelText(/name/i) as HTMLInputElement).value).toBe("alpha"));
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() =>
      expect(window.api.editMcpServer).toHaveBeenCalledWith(
        "alpha",
        expect.objectContaining({ name: "alpha", transport: "stdio" }),
      ),
    );
  });
});
