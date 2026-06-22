import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FavoriteRepo, RepoCandidate } from "@/lib/types";

import { useFavoriteRepos } from "../useFavoriteRepos";

function repo(path: string, label: string | null = null): FavoriteRepo {
  return { path, label, addedAt: "2026-06-11T00:00:00Z", logoDataUrl: null };
}

function candidate(path: string, label: string | null, logoDataUrl: string | null): RepoCandidate {
  return { path, scope: "project", hasClaude: true, plugins: [], label, logoDataUrl, language: null };
}

const listFavoriteRepos = vi.fn<() => Promise<FavoriteRepo[]>>();
const addFavoriteRepo =
  vi.fn<(p: string, l?: string, logo?: string | null) => Promise<FavoriteRepo>>();
const removeFavoriteRepo = vi.fn<(p: string) => Promise<void>>();
const scanSingleRepo = vi.fn<(p: string) => Promise<RepoCandidate | null>>();

beforeEach(() => {
  listFavoriteRepos.mockReset();
  addFavoriteRepo.mockReset();
  removeFavoriteRepo.mockReset();
  scanSingleRepo.mockReset();
  window.api = {
    listFavoriteRepos,
    addFavoriteRepo,
    removeFavoriteRepo,
    scanSingleRepo,
  } as unknown as Window["api"];
});

describe("useFavoriteRepos", () => {
  it("loads the favorites on mount", async () => {
    listFavoriteRepos.mockResolvedValue([repo("/a"), repo("/b")]);
    const { result } = renderHook(() => useFavoriteRepos());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.repos.map((r) => r.path)).toEqual(["/a", "/b"]);
  });

  it("add() scans the folder and forwards the detected label + logo, then refreshes", async () => {
    listFavoriteRepos.mockResolvedValueOnce([]).mockResolvedValueOnce([repo("/new", "desc")]);
    scanSingleRepo.mockResolvedValue(candidate("/new", "desc", "data:image/png;base64,AAAA"));
    addFavoriteRepo.mockResolvedValue(repo("/new", "desc"));
    const { result } = renderHook(() => useFavoriteRepos());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.add("/new");
    });

    expect(scanSingleRepo).toHaveBeenCalledWith("/new");
    expect(addFavoriteRepo).toHaveBeenCalledWith("/new", "desc", "data:image/png;base64,AAAA");
    expect(result.current.repos.map((r) => r.path)).toEqual(["/new"]);
  });

  it("add() falls back to a bare add when the scan returns null", async () => {
    listFavoriteRepos.mockResolvedValueOnce([]).mockResolvedValueOnce([repo("/new")]);
    scanSingleRepo.mockResolvedValue(null);
    addFavoriteRepo.mockResolvedValue(repo("/new"));
    const { result } = renderHook(() => useFavoriteRepos());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.add("/new");
    });

    expect(addFavoriteRepo).toHaveBeenCalledWith("/new", undefined, undefined);
    expect(result.current.repos.map((r) => r.path)).toEqual(["/new"]);
  });

  it("exposes the path being scanned as pending while add() is in flight, then clears it", async () => {
    listFavoriteRepos.mockResolvedValueOnce([]).mockResolvedValueOnce([repo("/new")]);
    let resolveScan: (c: RepoCandidate | null) => void = () => {};
    scanSingleRepo.mockReturnValue(
      new Promise<RepoCandidate | null>((resolve) => {
        resolveScan = resolve;
      }),
    );
    addFavoriteRepo.mockResolvedValue(repo("/new"));
    const { result } = renderHook(() => useFavoriteRepos());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let addPromise: Promise<void> = Promise.resolve();
    act(() => {
      addPromise = result.current.add("/new");
    });
    await waitFor(() => expect(result.current.pending).toBe("/new"));

    await act(async () => {
      resolveScan(null);
      await addPromise;
    });
    expect(result.current.pending).toBeNull();
  });

  it("remove() calls the api and refreshes the list", async () => {
    listFavoriteRepos.mockResolvedValueOnce([repo("/a"), repo("/b")]).mockResolvedValueOnce([repo("/b")]);
    removeFavoriteRepo.mockResolvedValue(undefined);
    const { result } = renderHook(() => useFavoriteRepos());
    await waitFor(() => expect(result.current.repos).toHaveLength(2));

    await act(async () => {
      await result.current.remove("/a");
    });

    expect(removeFavoriteRepo).toHaveBeenCalledWith("/a");
    expect(result.current.repos.map((r) => r.path)).toEqual(["/b"]);
  });
});
