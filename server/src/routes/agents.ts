import { Router } from "express";
import * as agentService from "../services/agent.service.js";

const router = Router();

router.get("/", async (_req, res) => {
  const agents = await agentService.getAllAgents();
  res.json(agents);
});

router.get("/folders", async (_req, res) => {
  const folders = await agentService.getFolders();
  res.json(folders);
});

router.get("/:name", async (req, res) => {
  const agent = await agentService.getAgent(req.params.name);
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  res.json(agent);
});

router.post("/", async (req, res) => {
  try {
    const agent = await agentService.createAgent(req.body);
    res.status(201).json(agent);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch("/:name", async (req, res) => {
  try {
    const agent = await agentService.updateAgent(req.params.name, req.body);
    res.json(agent);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:name", async (req, res) => {
  try {
    await agentService.deleteAgent(req.params.name);
    res.status(204).end();
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/:name/memory", async (req, res) => {
  const agent = await agentService.getAgent(req.params.name);
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  res.json(agent.memoryFiles);
});

router.get("/:name/memory/:fileName", async (req, res) => {
  const file = await agentService.getMemoryFile(req.params.name, req.params.fileName);
  if (!file) return res.status(404).json({ error: "Memory file not found" });
  res.json(file);
});

router.put("/:name/memory/:fileName", async (req, res) => {
  try {
    const file = await agentService.updateMemoryFile(
      req.params.name,
      req.params.fileName,
      req.body.content
    );
    res.json(file);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:name/memory/:fileName", async (req, res) => {
  try {
    await agentService.deleteMemoryFile(req.params.name, req.params.fileName);
    res.status(204).end();
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
