import { Router } from "express";
import * as eventsService from "../services/events.service.js";
import { addClient } from "../services/sse.js";

const router = Router();

router.get("/stream", (req, res) => {
  addClient(res);
});

router.get("/", async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const events = await eventsService.getRecentEvents(limit);
  res.json(events);
});

router.get("/stats", async (_req, res) => {
  const stats = await eventsService.getStats();
  res.json(stats);
});

router.get("/stats/agents", async (_req, res) => {
  const stats = await eventsService.getStatsPerAgent();
  res.json(stats);
});

router.get("/agent/:name", async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const events = await eventsService.getEventsByAgent(req.params.name, limit);
  res.json(events);
});

export default router;
