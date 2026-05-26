import { Router } from "express";
import * as memoryService from "../services/memory.service.js";
import * as projectService from "../services/project.service.js";

const router = Router();

router.get("/:projectId", async (req, res) => {
  const project = await projectService.getProject(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });
  const files = await memoryService.getProjectMemory(project.path);
  res.json(files);
});

router.put("/:projectId/:fileName", async (req, res) => {
  const project = await projectService.getProject(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });
  const { content } = req.body;
  if (content === undefined) return res.status(400).json({ error: "content is required" });
  const file = await memoryService.updateProjectMemoryFile(project.path, req.params.fileName, content);
  res.json(file);
});

router.delete("/:projectId/:fileName", async (req, res) => {
  const project = await projectService.getProject(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });
  await memoryService.deleteProjectMemoryFile(project.path, req.params.fileName);
  res.status(204).end();
});

export default router;
