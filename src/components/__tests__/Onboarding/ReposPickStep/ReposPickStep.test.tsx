import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReposPickStep } from "@/components/Onboarding/ReposPickStep/ReposPickStep";
import type { FavoriteRepo, RepoCandidate } from "@/lib/types";

function candidate(
  path: string,
  label: string | null = null,
  logoDataUrl: string | null = null,
): RepoCandidate {
  return { path, scope: "project", hasClaude: true, plugins: [], label, logoDataUrl };
}

function favorite(path: string): FavoriteRepo {
  return { path, label: null, addedAt: "2026-06-11T00:00:00Z", logoDataUrl: null };
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
    render(<ReposPickStep stepIndex={5} onNext={vi.fn()} />);
    expect(await screen.findByText("alpha")).toBeInTheDocument();
    expect(screen.getByText("A web app")).toBeInTheDocument();
  });

  it("renders the detected logo image when present, else a letter avatar", async () => {
    const dataUrl = "data:image/png;base64,AAAA";
    scanRepos.mockResolvedValue([
      candidate("/code/alpha", null, dataUrl),
      candidate("/code/beta"),
    ]);
    render(<ReposPickStep stepIndex={5} onNext={vi.fn()} />);

    const logo = await screen.findByRole("img");
    expect(logo).toHaveAttribute("src", dataUrl);
    // beta has no logo → fallback shows its first letter.
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("shows a progress bar while scanning and hides the action buttons", async () => {
    let resolveScan: (repos: RepoCandidate[]) => void = () => {};
    scanRepos.mockImplementation(
      () => new Promise<RepoCandidate[]>((resolve) => (resolveScan = resolve)),
    );
    render(<ReposPickStep stepIndex={5} onNext={vi.fn()} />);

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /continue/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add a folder/i })).not.toBeInTheDocument();

    await act(async () => {
      resolveScan([]);
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument(),
    );
  });

  it("checking a repo persists it as a favorite", async () => {
    scanRepos.mockResolvedValue([candidate("/code/alpha")]);
    render(<ReposPickStep stepIndex={5} onNext={vi.fn()} />);
    const box = await screen.findByRole("checkbox", { name: /alpha/i });

    await act(async () => {
      fireEvent.click(box);
    });

    await waitFor(() =>
      expect(addFavoriteRepo).toHaveBeenCalledWith("/code/alpha", undefined, null),
    );
  });

  it("checking a repo persists its detected logo alongside the favorite", async () => {
    const dataUrl = "data:image/png;base64,AAAA";
    scanRepos.mockResolvedValue([candidate("/code/alpha", "A web app", dataUrl)]);
    render(<ReposPickStep stepIndex={5} onNext={vi.fn()} />);
    const box = await screen.findByRole("checkbox", { name: /alpha/i });

    await act(async () => {
      fireEvent.click(box);
    });

    await waitFor(() =>
      expect(addFavoriteRepo).toHaveBeenCalledWith("/code/alpha", "A web app", dataUrl),
    );
  });

  it("unchecking an already-favorite repo removes it", async () => {
    scanRepos.mockResolvedValue([candidate("/code/alpha")]);
    listFavoriteRepos.mockResolvedValue([favorite("/code/alpha")]);
    render(<ReposPickStep stepIndex={5} onNext={vi.fn()} />);
    const box = await screen.findByRole("checkbox", { name: /alpha/i });
    await waitFor(() => expect(box).toBeChecked());

    await act(async () => {
      fireEvent.click(box);
    });

    await waitFor(() => expect(removeFavoriteRepo).toHaveBeenCalledWith("/code/alpha"));
  });

  it("'Add a folder' picks a folder and pins it", async () => {
    openDirectoryPicker.mockResolvedValue("/code/manual");
    render(<ReposPickStep stepIndex={5} onNext={vi.fn()} />);
    const add = await screen.findByRole("button", { name: /add a folder/i });

    await act(async () => {
      fireEvent.click(add);
    });

    // A manually-picked folder carries no detected logo (renderer can't read FS).
    await waitFor(() => expect(addFavoriteRepo).toHaveBeenCalledWith("/code/manual"));
    expect(await screen.findByText("manual")).toBeInTheDocument();
  });

  it("'Continue' advances", async () => {
    const onNext = vi.fn();
    render(<ReposPickStep stepIndex={5} onNext={onNext} />);
    const next = await screen.findByRole("button", { name: /continue/i });

    await act(async () => {
      fireEvent.click(next);
    });

    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
