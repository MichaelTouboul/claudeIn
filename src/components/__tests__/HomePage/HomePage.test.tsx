import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HomePage } from "@/components/HomePage/HomePage";
import { AppPage, useAppStore } from "@/store/useAppStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { FavoriteRepo, UserProfile } from "@/types/user.types";

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    claudeUserPath: "/home/u/.claude",
    name: "Ada",
    role: "Engineer",
    plugins: ["babysitter"],
    capabilities: { agents: { count: 2, names: ["a", "b"] }, skills: 1, mcp: 0, hooks: 3 },
    summary: "A tidy setup.",
    domains: ["backend"],
    workflow: "TDD",
    onboardingCompletedAt: "x",
    generatedAt: null,
    updatedAt: null,
    ...overrides,
  };
}

function repo(path: string, label: string | null = null): FavoriteRepo {
  return { path, label, addedAt: "2026-06-11T00:00:00Z" };
}

const getUserProfile = vi.fn<() => Promise<UserProfile | null>>();
const saveUserProfile = vi.fn<(p: UserProfile) => Promise<UserProfile>>();
const listFavoriteRepos = vi.fn<() => Promise<FavoriteRepo[]>>();
const addFavoriteRepo = vi.fn<(p: string, l?: string) => Promise<FavoriteRepo>>();
const removeFavoriteRepo = vi.fn<(p: string) => Promise<void>>();
const openDirectoryPicker = vi.fn<() => Promise<string | null>>();
const getProjects = vi.fn();

beforeEach(() => {
  useAppStore.setState({ currentPage: AppPage.Home, selectedProject: null });
  useWorkspaceStore.setState({ dashboards: [], activeDashboardId: null, homeDir: "" });
  getUserProfile.mockReset().mockResolvedValue(makeProfile());
  saveUserProfile.mockReset().mockImplementation((p) => Promise.resolve(p));
  listFavoriteRepos.mockReset().mockResolvedValue([]);
  addFavoriteRepo.mockReset();
  removeFavoriteRepo.mockReset().mockResolvedValue(undefined);
  openDirectoryPicker.mockReset();
  getProjects.mockReset().mockResolvedValue([]);
  window.api = {
    getUserProfile,
    saveUserProfile,
    listFavoriteRepos,
    addFavoriteRepo,
    removeFavoriteRepo,
    openDirectoryPicker,
    getProjects,
  } as unknown as Window["api"];
});

describe("HomePage", () => {
  it("greets the user by name", async () => {
    render(<HomePage />);
    expect(await screen.findByText(/Ada/)).toBeInTheDocument();
  });

  it("renders a card per favorite repo", async () => {
    listFavoriteRepos.mockResolvedValue([repo("/code/alpha"), repo("/code/beta", "Beta")]);
    render(<HomePage />);
    expect(await screen.findByText("alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("shows an empty-state hint when there are no favorite repos", async () => {
    listFavoriteRepos.mockResolvedValue([]);
    render(<HomePage />);
    expect(await screen.findByText(/aucun dépôt favori/i)).toBeInTheDocument();
    // The add affordance stays so the user can act on the empty state.
    expect(screen.getByRole("button", { name: /ajouter/i })).toBeInTheDocument();
  });

  it("opening a favorite navigates to the dashboard and selects that project", async () => {
    listFavoriteRepos.mockResolvedValue([repo("/code/alpha")]);
    render(<HomePage />);
    const card = await screen.findByText("alpha");
    const open = within(card.closest("[data-repo-card]") as HTMLElement).getByRole("button", {
      name: /ouvrir/i,
    });

    await act(async () => {
      fireEvent.click(open);
    });

    expect(useAppStore.getState().currentPage).toBe(AppPage.Dashboard);
    expect(useAppStore.getState().selectedProject?.path).toBe("/code/alpha");
  });

  it("the + ajouter card opens the folder picker and adds the chosen dir", async () => {
    openDirectoryPicker.mockResolvedValue("/code/new");
    addFavoriteRepo.mockResolvedValue(repo("/code/new"));
    listFavoriteRepos.mockResolvedValueOnce([]).mockResolvedValueOnce([repo("/code/new")]);
    render(<HomePage />);
    const addCard = await screen.findByRole("button", { name: /ajouter/i });

    await act(async () => {
      fireEvent.click(addCard);
    });

    await waitFor(() => expect(addFavoriteRepo).toHaveBeenCalledWith("/code/new", undefined));
  });

  it("does not add a favorite when the picker is cancelled", async () => {
    openDirectoryPicker.mockResolvedValue(null);
    render(<HomePage />);
    const addCard = await screen.findByRole("button", { name: /ajouter/i });

    await act(async () => {
      fireEvent.click(addCard);
    });

    expect(addFavoriteRepo).not.toHaveBeenCalled();
  });

  it("removing a favorite calls the api", async () => {
    listFavoriteRepos.mockResolvedValueOnce([repo("/code/alpha")]).mockResolvedValueOnce([]);
    render(<HomePage />);
    const card = (await screen.findByText("alpha")).closest("[data-repo-card]") as HTMLElement;
    const remove = within(card).getByRole("button", { name: /retirer/i });

    await act(async () => {
      fireEvent.click(remove);
    });

    expect(removeFavoriteRepo).toHaveBeenCalledWith("/code/alpha");
  });

  it("shows the Task action as disabled with a 'bientôt' hint", async () => {
    render(<HomePage />);
    const task = await screen.findByRole("button", { name: /task/i });
    expect(task).toBeDisabled();
  });

  it("the Customize Claude action navigates to the customize page", async () => {
    render(<HomePage />);
    const customize = await screen.findByRole("button", { name: /customize claude/i });

    await act(async () => {
      fireEvent.click(customize);
    });

    expect(useAppStore.getState().currentPage).toBe(AppPage.Customize);
  });

  it("opens the profile view from the 'voir mon profil' affordance", async () => {
    render(<HomePage />);
    const link = await screen.findByRole("button", { name: /voir mon profil/i });

    await act(async () => {
      fireEvent.click(link);
    });

    expect(await screen.findByText(/A tidy setup\./)).toBeInTheDocument();
  });
});
