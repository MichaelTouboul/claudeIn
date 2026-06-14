import { BrowserWindow } from "electron";

export function broadcast(data: Record<string, unknown>): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send("push-event", data);
  }
}
