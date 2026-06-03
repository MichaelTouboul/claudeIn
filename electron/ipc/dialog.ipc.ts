import { exec } from "node:child_process";

import { ipcMain, dialog, BrowserWindow } from "electron";
import fs from "fs";
import os from "node:os";
import path from "path";

function cleanTitle(raw: string): string {
  // Take the first non-empty line only.
  let title = raw
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0) ?? "";
  // Strip an echoed leading "Title:" / "Title -" prefix (case-insensitive).
  title = title.replace(/^title\s*[:-]\s*/i, "");
  // Strip wrapping quotes/backticks at start/end.
  title = title.replace(/^["'`]+/, "").replace(/["'`]+$/, "");
  // Strip trailing punctuation.
  title = title.replace(/[.…:-]+$/, "");
  // If more than 8 words, keep the first 8.
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length > 8) {
    title = words.slice(0, 8).join(" ");
  }
  return title.slice(0, 50).trim();
}

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
    const prompt = `You are labeling a conversation. Output ONLY a short topic label of 3-6 words. It is a label, not a sentence. No quotes, no trailing punctuation, no "Title:" prefix, no explanation — just the label text.

<conversation>
User: ${userMessage.slice(0, 300)}
Assistant: ${assistantMessage.slice(0, 300)}
</conversation>

Title:`;
    return new Promise<string>((resolve) => {
      // The title call must not create a session transcript inside a scanned
      // project, so it runs in a throwaway tmp cwd the app never scans.
      const proc = exec("claude --print --max-turns 1", { timeout: 15000, encoding: "utf-8", env: { ...process.env }, cwd: os.tmpdir() }, (error, stdout) => {
        if (error || !stdout.trim()) {
          // On failure return an empty string: the renderer applies a title only
          // when it's truthy, so the tab keeps its generic 'Chat' label and we
          // never surface the raw user prompt as the conversation title.
          resolve("");
        } else {
          resolve(cleanTitle(stdout));
        }
      });
      proc.stdin?.write(prompt);
      proc.stdin?.end();
    });
  });
}
