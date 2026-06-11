import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FavoriteRepo } from "@/types/user.types";

import { useFavoriteRepos } from "./useFavoriteRepos";

function repo(path: string, label: string | null = null): FavoriteRepo {
  return { path, label, addedAt: "2026-06-11T00:00:00Z" };
}

const listFavoriteRepos = vi.fn<() => Promise<FavoriteRepo[]>>();
const addFavoriteRepo = vi.fn<(p: string, l?: string) => Promise<FavoriteRepo>>();
const removeFavoriteRepo = vi.fn<(p: string) => Promise<void>>();

beforeEach(() => {
  listFavoriteRepos.mockReset();
  addFavoriteRepo.mockReset();
  removeFavoriteRepo.mockReset();
  window.api = { listFavoriteRepos, addFavoriteRepo, removeFavoriteRepo } as unknown as Window["api"];
});

describe("useFavoriteRepos", () => {
  it("loads the favorites on mount", async () => {
    listFavoriteRepos.mockResolvedValue([repo("/a"), repo("/b")]);
    const { result } = renderHook(() => useFavoriteRepos());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.repos.map((r) => r.path)).toEqual(["/a", "/b"]);
  });

  it("add() calls the api and refreshes the list", async () => {
    listFavoriteRepos.mockResolvedValueOnce([]).mockResolvedValueOnce([repo("/new")]);
    addFavoriteRepo.mockResolvedValue(repo("/new"));
    const { result } = renderHook(() => useFavoriteRepos());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.add("/new", "label");
    });

    expect(addFavoriteRepo).toHaveBeenCalledWith("/new", "label");
    expect(result.current.repos.map((r) => r.path)).toEqual(["/new"]);
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
