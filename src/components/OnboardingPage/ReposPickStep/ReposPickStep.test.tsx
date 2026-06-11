import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FavoriteRepo, RepoCandidate } from "@/types/user.types";

import { ReposPickStep } from "./ReposPickStep";

function candidate(path: string, label: string | null = null): RepoCandidate {
  return { path, scope: "project", hasClaude: true, plugins: [], label };
}

function favorite(path: string): FavoriteRepo {
  return { path, label: null, addedAt: "2026-06-11T00:00:00Z" };
}

const scanRepos = vi.fn<() => Promise<RepoCandidate[]>>();
const listFavoriteRepos = vi.fn<() => Promise<FavoriteRepo[]>>();
const addFavoriteRepo = vi.fn();
const removeFavoriteRepo = vi.fn<(p: string) => Promise<void>>();
const openDirectoryPicker = vi.fn<() => Promise<string | null>>();

beforeEach(() => {
  scanRepos.mockReset().mockResolvedValue([]);
  listFavoriteRepos.mockReset().mockResolvedValue([]);
  addFavoriteRepo.mockReset().mockResolvedValue(undefined);
  removeFavoriteRepo.mockReset().mockResolvedValue(undefined);
  openDirectoryPicker.mockReset();
  window.api = {
    scanRepos,
    listFavoriteRepos,
    addFavoriteRepo,
    removeFavoriteRepo,
    openDirectoryPicker,
  } as unknown as Window["api"];
});

describe("ReposPickStep", () => {
  it("lists scanned repos with their LLM labels", async () => {
    scanRepos.mockResolvedValue([candidate("/code/alpha", "A web app")]);
    render(<ReposPickStep onNext={vi.fn()} />);
    expect(await screen.findByText("alpha")).toBeInTheDocument();
    expect(screen.getByText("A web app")).toBeInTheDocument();
  });

  it("checking a repo persists it as a favorite", async () => {
    scanRepos.mockResolvedValue([candidate("/code/alpha")]);
    render(<ReposPickStep onNext={vi.fn()} />);
    const box = await screen.findByRole("checkbox", { name: /alpha/i });

    await act(async () => {
      fireEvent.click(box);
    });

    await waitFor(() => expect(addFavoriteRepo).toHaveBeenCalledWith("/code/alpha"));
  });

  it("unchecking an already-favorite repo removes it", async () => {
    scanRepos.mockResolvedValue([candidate("/code/alpha")]);
    listFavoriteRepos.mockResolvedValue([favorite("/code/alpha")]);
    render(<ReposPickStep onNext={vi.fn()} />);
    const box = await screen.findByRole("checkbox", { name: /alpha/i });
    await waitFor(() => expect(box).toBeChecked());

    await act(async () => {
      fireEvent.click(box);
    });

    await waitFor(() => expect(removeFavoriteRepo).toHaveBeenCalledWith("/code/alpha"));
  });

  it("'Ajouter un dossier' picks a folder and pins it", async () => {
    openDirectoryPicker.mockResolvedValue("/code/manual");
    render(<ReposPickStep onNext={vi.fn()} />);
    const add = await screen.findByRole("button", { name: /ajouter un dossier/i });

    await act(async () => {
      fireEvent.click(add);
    });

    await waitFor(() => expect(addFavoriteRepo).toHaveBeenCalledWith("/code/manual"));
    expect(await screen.findByText("manual")).toBeInTheDocument();
  });

  it("'Continuer' advances", async () => {
    const onNext = vi.fn();
    render(<ReposPickStep onNext={onNext} />);
    const next = await screen.findByRole("button", { name: /continuer/i });

    await act(async () => {
      fireEvent.click(next);
    });

    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
