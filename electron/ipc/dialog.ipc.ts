import { ipcMain, dialog, BrowserWindow } from "electron";

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
}
