import { getDb } from "../core/db";

export type FavoriteItem = {
  item_type: "agent" | "skill" | "hook";
  item_name: string;
};

export function getFavorites(projectId: string): FavoriteItem[] {
  return getDb()
    .prepare(
      "SELECT item_type, item_name FROM favorites WHERE project_id = ? ORDER BY created_at ASC"
    )
    .all(projectId) as FavoriteItem[];
}

export function addFavorite(
  projectId: string,
  itemType: string,
  itemName: string
): void {
  getDb()
    .prepare(
      "INSERT INTO favorites (item_type, item_name, project_id) VALUES (?, ?, ?) ON CONFLICT DO NOTHING"
    )
    .run(itemType, itemName, projectId);
}

export function removeFavorite(
  projectId: string,
  itemType: string,
  itemName: string
): void {
  getDb()
    .prepare(
      "DELETE FROM favorites WHERE item_type = ? AND item_name = ? AND project_id = ?"
    )
    .run(itemType, itemName, projectId);
}
