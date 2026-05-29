import { useEffect } from "react";
import { create } from "zustand";

export type FavoriteItem = {
  item_type: "agent" | "skill" | "hook";
  item_name: string;
};

type FavoritesState = {
  byProject: Record<string, FavoriteItem[]>;
  load: (projectId: string) => Promise<void>;
  toggle: (projectId: string, type: FavoriteItem["item_type"], name: string) => Promise<void>;
};

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  byProject: {},

  load: async (projectId) => {
    const data = await window.api.getFavorites(projectId);
    set((s) => ({ byProject: { ...s.byProject, [projectId]: data } }));
  },

  toggle: async (projectId, type, name) => {
    const current = get().byProject[projectId] || [];
    const exists = current.some((f) => f.item_type === type && f.item_name === name);
    if (exists) {
      await window.api.removeFavorite(projectId, type, name);
    } else {
      await window.api.addFavorite(projectId, type, name);
    }
    await get().load(projectId);
  },
}));

export function useInitFavorites(projectId: string | null) {
  const load = useFavoritesStore((s) => s.load);
  useEffect(() => {
    if (projectId) void load(projectId);
  }, [projectId, load]);
}
