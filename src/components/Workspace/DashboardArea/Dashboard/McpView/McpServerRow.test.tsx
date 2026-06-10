import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { McpServerRaw } from "@/types/mcp-manage.types";
import type { McpServerEntry } from "@/types/mcp-mirror.types";

import { McpServerRow } from "./McpServerRow";

function entry(overrides: Partial<McpServerEntry> = {}): McpServerEntry {
  return {
    name: "context7",
    source: "project-mcp-json",
    scope: "project",
    transport: "stdio",
    target: "npx -y @context7/mcp",
    shadowed: false,
    ...overrides,
  };
}

function raw(name: string): McpServerRaw {
  return { name, transport: "stdio", scope: "project", command: "npx", args: ["-y", name] };
}

function noopGetRaw(): Promise<McpServerRaw> {
  return Promise.resolve(raw("context7"));
}

function noopRemove(): Promise<{ ok: true }> {
  return Promise.resolve({ ok: true });
}

function noopEdit(): Promise<{ ok: true }> {
  return Promise.resolve({ ok: true });
}

describe("McpServerRow", () => {
  it("renders the server name, badges and target", () => {
    render(<McpServerRow server={entry()} getRaw={noopGetRaw} remove={noopRemove} edit={noopEdit} />);
    expect(screen.getByText("context7")).toBeInTheDocument();
    expect(screen.getByText("stdio")).toBeInTheDocument();
    expect(screen.getByText("Project .mcp.json")).toBeInTheDocument();
    expect(screen.getByText("npx -y @context7/mcp")).toBeInTheDocument();
  });

  it("dims and tags a shadowed row", () => {
    render(<McpServerRow server={entry({ shadowed: true })} getRaw={noopGetRaw} remove={noopRemove} edit={noopEdit} />);
    expect(screen.getByText("shadowed")).toBeInTheDocument();
    expect(screen.getByTestId("mcp-server-row")).toHaveAttribute("data-shadowed", "true");
  });

  it("expanding fetches the raw config and renders it", async () => {
    const getRaw = vi.fn(async (name: string) => raw(name));
    render(<McpServerRow server={entry()} getRaw={getRaw} remove={noopRemove} edit={noopEdit} />);
    fireEvent.click(screen.getByRole("button", { name: /show raw config for context7/i }));
    await waitFor(() => expect(screen.getByTestId("mcp-raw-config")).toBeInTheDocument());
    expect(getRaw).toHaveBeenCalledWith("context7", "project", undefined);
    expect(screen.getByText("command")).toBeInTheDocument();
  });

  it("expand control is collapsed by default (no raw config shown)", () => {
    render(<McpServerRow server={entry()} getRaw={noopGetRaw} remove={noopRemove} edit={noopEdit} />);
    expect(screen.queryByTestId("mcp-raw-config")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /show raw config for context7/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("Remove opens a confirm dialog and calls remove on confirm", async () => {
    const remove = vi.fn(noopRemove);
    render(<McpServerRow server={entry()} getRaw={noopGetRaw} remove={remove} edit={noopEdit} />);
    fireEvent.click(screen.getByRole("button", { name: /remove context7/i }));
    const confirm = await screen.findByRole("button", { name: /^remove$/i });
    fireEvent.click(confirm);
    await waitFor(() => expect(remove).toHaveBeenCalledWith("context7", "project", undefined));
  });

  it("the confirm dialog can be cancelled without calling remove", async () => {
    const remove = vi.fn(noopRemove);
    render(<McpServerRow server={entry()} getRaw={noopGetRaw} remove={remove} edit={noopEdit} />);
    fireEvent.click(screen.getByRole("button", { name: /remove context7/i }));
    const cancel = await screen.findByRole("button", { name: /cancel/i });
    fireEvent.click(cancel);
    await waitFor(() => expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument());
    expect(remove).not.toHaveBeenCalled();
  });

  it("Edit fetches the raw config, prefills the form and submits via edit", async () => {
    const getRaw = vi.fn(async (name: string) => raw(name));
    const edit = vi.fn(noopEdit);
    render(<McpServerRow server={entry()} getRaw={getRaw} remove={noopRemove} edit={edit} />);
    fireEvent.click(screen.getByRole("button", { name: /edit context7/i }));
    await waitFor(() => expect(getRaw).toHaveBeenCalledWith("context7", "project", undefined));
    await waitFor(() =>
      expect((screen.getByLabelText(/name/i) as HTMLInputElement).value).toBe("context7"),
    );
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() =>
      expect(edit).toHaveBeenCalledWith(
        "context7",
        expect.objectContaining({ name: "context7", transport: "stdio", command: "npx" }),
      ),
    );
  });

  it("passes projectPath through to getRaw and remove", async () => {
    const getRaw = vi.fn(async (name: string) => raw(name));
    const remove = vi.fn(noopRemove);
    render(
      <McpServerRow server={entry()} getRaw={getRaw} remove={remove} edit={noopEdit} projectPath="/repo" />,
    );
    fireEvent.click(screen.getByRole("button", { name: /show raw config for context7/i }));
    await waitFor(() => expect(getRaw).toHaveBeenCalledWith("context7", "project", "/repo"));
  });
});
