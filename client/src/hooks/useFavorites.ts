import { useState, useEffect, useCallback } from "react";

export type FavoriteItem = {
  item_type: "agent" | "skill" | "hook";
  item_name: string;
};

export function useFavorites(projectId: string | null) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  const refresh = useCallback(async () => {
    if (!projectId) return;
    const data = await fetch(`/api/favorites/${projectId}`).then((r) => r.json());
    setFavorites(data);
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
        await fetch(`/api/favorites/${projectId}/${type}/${name}`, { method: "DELETE" });
      } else {
        await fetch(`/api/favorites/${projectId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ item_type: type, item_name: name }),
        });
      }
      await refresh();
    },
    [projectId, isFavorite, refresh]
  );

  return { favorites, isFavorite, toggle, refresh };
}
