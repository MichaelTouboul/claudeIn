import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ConnectorServerList } from "@/components/CustomizePage/CustomizeSidebar/ConnectorServerList";
import type { McpServerEntry } from "@/types/mcp-mirror.types";

function entry(name: string, overrides: Partial<McpServerEntry> = {}): McpServerEntry {
  return {
    name,
    source: "user-settings",
    scope: "user",
    transport: "stdio",
    target: `cmd ${name}`,
    shadowed: false,
    ...overrides,
  };
}

describe("ConnectorServerList", () => {
  it("renders a labelled listbox with one option per server", () => {
    render(
      <ConnectorServerList
        label="Personal"
        servers={[entry("a"), entry("b")]}
        selectedKey={null}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
      />,
    );
    expect(screen.getByRole("listbox", { name: /personal/i })).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });

  it("marks the selected server option as selected", () => {
    render(
      <ConnectorServerList
        label="Personal"
        servers={[entry("a"), entry("b")]}
        selectedKey="user-settings:a"
        onSelect={vi.fn()}
        onAdd={vi.fn()}
      />,
    );
    expect(screen.getByRole("option", { name: /^a$/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: /^b$/ })).toHaveAttribute("aria-selected", "false");
  });

  it("invokes onSelect when an option is clicked", () => {
    const onSelect = vi.fn();
    const a = entry("a");
    render(
      <ConnectorServerList
        label="Personal"
        servers={[a]}
        selectedKey={null}
        onSelect={onSelect}
        onAdd={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("option", { name: /^a$/ }));
    expect(onSelect).toHaveBeenCalledWith(a);
  });

  it("shows an empty hint when the scope has no servers", () => {
    render(
      <ConnectorServerList
        label="Personal"
        servers={[]}
        selectedKey={null}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
      />,
    );
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByText(/no connectors yet/i)).toBeInTheDocument();
  });

  it("has an accessibly-named add control", () => {
    render(
      <ConnectorServerList
        label="Personal"
        servers={[]}
        selectedKey={null}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /add personal mcp server/i })).toBeInTheDocument();
  });
});
