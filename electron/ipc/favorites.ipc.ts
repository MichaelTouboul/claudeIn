import { ipcMain } from "electron";
import * as favoritesService from "../services/favorites.service";

export function registerFavoriteHandlers(): void {
  ipcMain.handle("favorites:list", (_e, projectId: string) => favoritesService.getFavorites(projectId));
  ipcMain.handle("favorites:add", (_e, projectId: string, itemType: string, itemName: string) =>
    favoritesService.addFavorite(projectId, itemType, itemName));
  ipcMain.handle("favorites:remove", (_e, projectId: string, itemType: string, itemName: string) =>
    favoritesService.removeFavorite(projectId, itemType, itemName));
}
