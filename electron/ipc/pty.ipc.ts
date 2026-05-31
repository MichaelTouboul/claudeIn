import { ipcMain } from "electron";

import * as ptyService from "../services/pty.service";

export function registerPtyHandlers(): void {
  ipcMain.handle("pty:create", (_e, projectPath: string, cwd: string, cols: number, rows: number) => {
    ptyService.createOrAttach(projectPath, cwd, cols, rows);
  });
  ipcMain.on("pty:write", (_e, projectPath: string, data: string) => ptyService.write(projectPath, data));
  ipcMain.on("pty:resize", (_e, projectPath: string, cols: number, rows: number) => ptyService.resize(projectPath, cols, rows));
  ipcMain.on("pty:kill", (_e, projectPath: string) => ptyService.kill(projectPath));
}
