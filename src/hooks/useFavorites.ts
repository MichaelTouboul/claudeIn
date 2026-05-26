import { useState, useEffect, useCallback } from "react";

export type FavoriteItem = {
  item_type: "agent" | "skill" | "hook";
  item_name: string;
};

export function useFavorites(projectId: string | null) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  const refresh = useCallback(async () => {
    if (!projectId) return;
    const data = await window.api.getFavorites(projectId);
    setFavorites(data as FavoriteItem[]);
  }, [projectId]);

  useEffect(() => { refresh(); }, [refresh]);

  const isFavorite = useCallback(
    (type: string, name: string) => favorites.some((f) => f.item_type === type && f.item_name === name),
    [favorites]
  );

  const toggle = useCallback(
    async (type: string, name: string) => {
      if (!projectId) return;
      if (isFavorite(type, name)) {
        await window.api.removeFavorite(projectId, type, name);
      } else {
        await window.api.addFavorite(projectId, type, name);
      }
      await refresh();
    },
    [projectId, isFavorite, refresh]
  );

  return { favorites, isFavorite, toggle, refresh };
}
