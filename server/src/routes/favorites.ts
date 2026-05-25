import { Router } from "express";
import * as favoritesService from "../services/favorites.service.js";

const router = Router();

router.get("/:projectId", async (req, res) => {
  const favorites = await favoritesService.getFavorites(req.params.projectId);
  res.json(favorites);
});

router.post("/:projectId", async (req, res) => {
  const { item_type, item_name } = req.body;
  if (!item_type || !item_name) {
    return res.status(400).json({ error: "item_type and item_name required" });
  }
  await favoritesService.addFavorite(req.params.projectId, item_type, item_name);
  res.status(201).json({ ok: true });
});

router.delete("/:projectId/:itemType/:itemName", async (req, res) => {
  await favoritesService.removeFavorite(
    req.params.projectId,
    req.params.itemType,
    req.params.itemName
  );
  res.status(204).end();
});

export default router;
