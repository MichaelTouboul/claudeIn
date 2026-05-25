import { pool } from "./db.js";

export type FavoriteItem = {
  item_type: "agent" | "skill" | "hook";
  item_name: string;
};

export async function getFavorites(projectId: string): Promise<FavoriteItem[]> {
  const result = await pool.query(
    `SELECT item_type, item_name FROM favorites WHERE project_id = $1 ORDER BY created_at ASC`,
    [projectId]
  );
  return result.rows;
}

export async function addFavorite(projectId: string, itemType: string, itemName: string): Promise<void> {
  await pool.query(
    `INSERT INTO favorites (item_type, item_name, project_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [itemType, itemName, projectId]
  );
}

export async function removeFavorite(projectId: string, itemType: string, itemName: string): Promise<void> {
  await pool.query(
    `DELETE FROM favorites WHERE item_type = $1 AND item_name = $2 AND project_id = $3`,
    [itemType, itemName, projectId]
  );
}
