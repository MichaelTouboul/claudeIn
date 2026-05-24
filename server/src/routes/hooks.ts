import { Router } from "express";
import * as eventsService from "../services/events.service.js";

const router = Router();

router.post("/event", async (req, res) => {
  try {
    const event = await eventsService.ingestEvent(req.body);
    res.status(201).json(event);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
