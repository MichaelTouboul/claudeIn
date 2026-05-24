import { Router } from "express";
import * as missionsService from "../services/missions.service.js";

const router = Router();

router.get("/", async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const status = req.query.status as string | undefined;
  const missions = await missionsService.getMissions(limit, status);
  res.json(missions);
});

router.post("/", async (req, res) => {
  try {
    const { agent_name, title, session_id } = req.body;
    const mission = await missionsService.createMission(agent_name, title, session_id);
    res.status(201).json(mission);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  const mission = await missionsService.getMission(parseInt(req.params.id));
  if (!mission) return res.status(404).json({ error: "Mission not found" });
  res.json(mission);
});

router.get("/:id/events", async (req, res) => {
  const events = await missionsService.getMissionEvents(parseInt(req.params.id));
  res.json(events);
});

export default router;
