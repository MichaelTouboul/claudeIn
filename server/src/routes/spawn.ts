import { Router } from "express";
import * as spawnService from "../services/spawn.service.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json(spawnService.getAllSessions());
});

router.get("/active", (_req, res) => {
  res.json(spawnService.getActiveSessions());
});

router.post("/", (req, res) => {
  const { agent_name, mission, cwd, resume_session_id } = req.body;
  if (!mission) return res.status(400).json({ error: "mission is required" });

  const session = spawnService.spawnAgent(agent_name || "_main", mission, cwd, resume_session_id);
  res.status(201).json(session);
});

router.get("/:sessionId", (req, res) => {
  const session = spawnService.getSession(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json(session);
});

router.post("/:sessionId/input", (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "text is required" });

  const ok = spawnService.sendInput(req.params.sessionId, text);
  if (!ok) return res.status(404).json({ error: "Session not found or not running" });
  res.json({ ok: true });
});

router.delete("/:sessionId", (req, res) => {
  const ok = spawnService.killSession(req.params.sessionId);
  if (!ok) return res.status(404).json({ error: "Session not found" });
  res.json({ ok: true });
});

export default router;
