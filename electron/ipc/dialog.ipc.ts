import { ipcMain, dialog, BrowserWindow } from "electron";
import fs from "fs";
import path from "path";

export function registerDialogHandlers(): void {
  ipcMain.handle("dialog:open-file", async (_e, kind: "all" | "image" = "all") => {
    const win = BrowserWindow.getFocusedWindow();
    const imageFilter = { name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif", "svg"] };
    const allFilter = { name: "All Files", extensions: ["*"] };
    // "image" scopes the picker to image types only; "all" leaves it unfiltered
    // (images still surfaced as a secondary filter for convenience).
    const filters = kind === "image" ? [imageFilter] : [allFilter, imageFilter];
    const result = await dialog.showOpenDialog(win!, {
      properties: ["openFile", "multiSelections"],
      filters,
    });
    if (result.canceled) return [];
    return result.filePaths;
  });

  ipcMain.handle("dialog:open-directory", async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win!, {
      properties: ["openDirectory"],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle("dialog:read-image", async (_e, filePath: string) => {
    try {
      if (!fs.existsSync(filePath)) return null;
      const data = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
        ".webp": "image/webp",
      };
      const mime = mimeTypes[ext] || "application/octet-stream";
      return `data:${mime};base64,${data.toString("base64")}`;
    } catch {
      return null;
    }
  });
}
