import { exec } from "node:child_process";

import { ipcMain, dialog, BrowserWindow } from "electron";
import fs from "fs";
import path from "path";

export function registerDialogHandlers(): void {
  ipcMain.handle("dialog:open-file", async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win!, {
      properties: ["openFile", "multiSelections"],
      filters: [
        { name: "All Files", extensions: ["*"] },
        { name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif", "svg"] },
      ],
    });
    if (result.canceled) return [];
    return result.filePaths;
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

  ipcMain.handle("dialog:generate-title", async (_e, userMessage: string, assistantMessage: string) => {
    const prompt = `Generate a concise title (3-6 words max) for this conversation. Reply ONLY with the title, nothing else — no quotes, no period, no explanation.

User: ${userMessage.slice(0, 200)}
Assistant: ${assistantMessage.slice(0, 200)}`;
    return new Promise<string>((resolve) => {
      const proc = exec("claude --print --max-turns 1", { timeout: 15000, encoding: "utf-8", env: { ...process.env } }, (error, stdout) => {
        if (error || !stdout.trim()) {
          let fallback = userMessage.replace(/[\n\r]+/g, " ").trim();
          if (fallback.length > 50) fallback = fallback.slice(0, 47) + "...";
          resolve(fallback);
        } else {
          resolve(stdout.trim().slice(0, 60));
        }
      });
      proc.stdin?.write(prompt);
      proc.stdin?.end();
    });
  });
}
