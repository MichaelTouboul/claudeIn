import { Router } from "express";
import * as costsService from "../services/costs.service.js";

const router = Router();

router.get("/summary", async (_req, res) => {
  const summary = await costsService.getCostsSummary();
  res.json(summary);
});

router.get("/by-day", async (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  const data = await costsService.getCostsByDay(days);
  res.json(data);
});

router.get("/by-agent", async (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  const data = await costsService.getCostsByAgent(days);
  res.json(data);
});

router.get("/by-agent-day", async (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  const data = await costsService.getCostsByAgentPerDay(days);
  res.json(data);
});

router.get("/by-tool", async (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  const data = await costsService.getCostsByTool(days);
  res.json(data);
});

export default router;
