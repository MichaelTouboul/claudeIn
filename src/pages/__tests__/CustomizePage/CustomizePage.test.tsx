import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FavoriteRepo,McpServerEntry, McpSnapshot  } from "@/lib/types";
import { CustomizePage } from "@/pages/CustomizePage/CustomizePage";
import { AppPage, useAppStore } from "@/store/useAppStore";
import { CustomizeSection, useCustomizeStore } from "@/store/useCustomizeStore";

const PROJECT = "/code/alpha";

function repo(path: string, label: string | null = null): FavoriteRepo {
  return { path, label, addedAt: "2026-06-11T00:00:00Z" };
}

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

const projectServer = entry("proj-srv", { scope: "project", source: "project-mcp-json" });
const personalServer = entry("home-srv", { scope: "user", source: "user-settings" });

function snapshotFor(projectPath?: string): McpSnapshot {
  const servers = projectPath ? [projectServer, personalServer] : [personalServer];
  return { projectPath: projectPath ?? null, servers };
}

beforeEach(() => {
  useAppStore.setState({ currentPage: AppPage.Customize, selectedProject: null });
  useCustomizeStore.getState().reset();
  window.api = {
    listFavoriteRepos: vi.fn(async () => [repo(PROJECT, "Alpha")]),
    getMcp: vi.fn(async (p?: string) => snapshotFor(p)),
    onMcpChanged: vi.fn(() => () => {}),
    getMcpRaw: vi.fn(async (name: string) => ({ name, transport: "stdio", scope: "project", command: "cmd" })),
    addMcpServer: vi.fn(async () => ({ ok: true as const })),
    editMcpServer: vi.fn(async () => ({ ok: true as const })),
    removeMcpServer: vi.fn(async () => ({ ok: true as const })),
  } as unknown as Window["api"];
});

async function selectRepo() {
  fireEvent.change(await screen.findByLabelText(/repository scope/i), { target: { value: PROJECT } });
  await screen.findByText("proj-srv");
}

describe("CustomizePage", () => {
  it("renders the top bar and goes back to home", async () => {
    render(<CustomizePage />);
    fireEvent.click(await screen.findByRole("button", { name: /back to home/i }));
    expect(useAppStore.getState().currentPage).toBe(AppPage.Home);
  });

  it("shows the Personal group and the hero when no repo is selected", async () => {
    render(<CustomizePage />);
    expect(await screen.findByTestId("customize-hero")).toBeInTheDocument();
    expect(await screen.findByText("home-srv")).toBeInTheDocument();
    expect(screen.queryByText("proj-srv")).not.toBeInTheDocument();
  });

  it("selecting a repo switches scope and lists project-scope servers", async () => {
    render(<CustomizePage />);
    await selectRepo();
    expect(window.api.getMcp).toHaveBeenCalledWith(PROJECT);
    expect(useCustomizeStore.getState().repoScope).toBe(PROJECT);
    expect(screen.getByText("proj-srv")).toBeInTheDocument();
    expect(screen.getByText("home-srv")).toBeInTheDocument();
  });

  it("selecting a server opens its detail in the content pane and focuses its heading", async () => {
    render(<CustomizePage />);
    fireEvent.click(await screen.findByText("home-srv"));
    const detail = await screen.findByTestId("connector-detail");
    expect(detail).toHaveTextContent("home-srv");
    expect(screen.queryByTestId("customize-hero")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "home-srv" })).toHaveFocus(),
    );
  });

  it("switching to Skills shows the placeholder", async () => {
    render(<CustomizePage />);
    fireEvent.click(await screen.findByRole("tab", { name: /skills/i }));
    expect(screen.getByTestId("skills-placeholder")).toBeInTheDocument();
  });

  it("removing a server confirms, calls removeMcpServer and shows the restart banner", async () => {
    render(<CustomizePage />);
    fireEvent.click(await screen.findByText("home-srv"));
    fireEvent.click(await screen.findByRole("button", { name: /remove home-srv/i }));
    fireEvent.click(await screen.findByRole("button", { name: /^remove$/i }));
    await waitFor(() => expect(window.api.removeMcpServer).toHaveBeenCalledWith("home-srv", "user", undefined));
    expect(await screen.findByTestId("mcp-restart-banner")).toBeInTheDocument();
  });

  it("editing a server prefills from getMcpRaw and submits editMcpServer", async () => {
    render(<CustomizePage />);
    fireEvent.click(await screen.findByText("home-srv"));
    fireEvent.click(await screen.findByRole("button", { name: /edit home-srv/i }));
    await waitFor(() => expect(window.api.getMcpRaw).toHaveBeenCalledWith("home-srv", "user", undefined));
    await waitFor(() => expect((screen.getByLabelText(/name/i) as HTMLInputElement).value).toBe("home-srv"));
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() =>
      expect(window.api.editMcpServer).toHaveBeenCalledWith(
        "home-srv",
        expect.objectContaining({ name: "home-srv" }),
      ),
    );
  });

  it("the Personal + button adds a user-scope server", async () => {
    render(<CustomizePage />);
    fireEvent.click(await screen.findByRole("button", { name: /add personal mcp server/i }));
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "new-srv" } });
    fireEvent.change(screen.getByLabelText(/command/i), { target: { value: "npx" } });
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));
    await waitFor(() =>
      expect(window.api.addMcpServer).toHaveBeenCalledWith(
        expect.objectContaining({ name: "new-srv", scope: "user", command: "npx" }),
      ),
    );
  });

  it("viewing raw config fetches and displays the server raw", async () => {
    render(<CustomizePage />);
    fireEvent.click(await screen.findByText("home-srv"));
    fireEvent.click(await screen.findByRole("button", { name: /show raw config for home-srv/i }));
    await waitFor(() => expect(window.api.getMcpRaw).toHaveBeenCalledWith("home-srv", "user", undefined));
  });

  it("the add dialog from the project group defaults to project scope", async () => {
    render(<CustomizePage />);
    await selectRepo();
    fireEvent.click(screen.getByRole("button", { name: /add this repo mcp server/i }));
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "proj-new" } });
    fireEvent.change(screen.getByLabelText(/command/i), { target: { value: "npx" } });
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));
    await waitFor(() =>
      expect(window.api.addMcpServer).toHaveBeenCalledWith(
        expect.objectContaining({ name: "proj-new", scope: "project", projectPath: PROJECT }),
      ),
    );
  });

  it("the section state defaults to Connectors", async () => {
    render(<CustomizePage />);
    await screen.findByTestId("customize-hero");
    expect(useCustomizeStore.getState().section).toBe(CustomizeSection.Connectors);
  });
});
