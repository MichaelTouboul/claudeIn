import { ipcMain, dialog, BrowserWindow } from "electron";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";

/** data-URL mime → file extension for a persisted clipboard/pasted image. */
const DATA_URL_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};

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

  // Persist a pasted clipboard image (a `data:image/*;base64,…` URL) to a temp
  // file and return its absolute path — the same shape `getPathForFile` yields
  // for picked/dropped files, so the renderer's attach pipeline is uniform. Used
  // for Cmd/Ctrl+V of a screenshot, which carries no on-disk path of its own.
  ipcMain.handle("dialog:save-image", async (_e, dataUrl: string) => {
    try {
      const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
      if (!match) return null;
      const ext = DATA_URL_EXT[match[1]];
      if (!ext) return null;
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cam-pasted-"));
      const filePath = path.join(dir, `image-${crypto.randomUUID()}${ext}`);
      fs.writeFileSync(filePath, Buffer.from(match[2], "base64"));
      return filePath;
    } catch {
      return null;
    }
  });
}
