import express from "express";
import cors from "cors";
import agentRoutes from "./routes/agents.js";
import hookRoutes from "./routes/hooks.js";
import eventRoutes from "./routes/events.js";
import missionRoutes from "./routes/missions.js";
import spawnRoutes from "./routes/spawn.js";
import costRoutes from "./routes/costs.js";
import projectRoutes from "./routes/projects.js";
import favoriteRoutes from "./routes/favorites.js";
import { initDb } from "./services/db.js";
import { getClientCount } from "./services/sse.js";

const app = express();
const PORT = process.env.PORT || 3456;

app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.use("/api/agents", agentRoutes);
app.use("/api/hooks", hookRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/missions", missionRoutes);
app.use("/api/spawn", spawnRoutes);
app.use("/api/costs", costRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/favorites", favoriteRoutes);

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    sse_clients: getClientCount(),
  });
});

async function start() {
  await initDb();
  console.log("Database initialized");

  app.listen(PORT, () => {
    console.log(`Agent Manager API running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
