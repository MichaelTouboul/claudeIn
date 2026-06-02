import { ipcMain } from "electron";
import * as projectService from "../services/project.service";
import * as skillsMirror from "../services/skills.mirror";

export function registerSkillHandlers(): void {
  // Single skill, full content (body + annex files) — on-demand for detail views.
  ipcMain.handle("skills:get", (_e, filePath: string) =>
    projectService.getSkill(filePath));

  // Skills mirror (additive): live union of user + project skills.
  ipcMain.handle("skills:mirror:get", (_e, projectPath?: string) =>
    skillsMirror.getSkillsMirror(projectPath));
  ipcMain.handle("skills:mirror:watch", (_e, projectPath?: string) =>
    skillsMirror.watchSkills(projectPath));
  ipcMain.handle("skills:mirror:unwatch", () => skillsMirror.unwatchSkills());
}
