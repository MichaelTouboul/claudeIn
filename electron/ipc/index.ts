import { registerAgentHandlers } from "./agents.ipc";
import { registerProjectHandlers } from "./projects.ipc";
import { registerSpawnHandlers } from "./spawn.ipc";
import { registerEventHandlers } from "./events.ipc";
import { registerMemoryHandlers } from "./memory.ipc";
import { registerCostHandlers } from "./costs.ipc";
import { registerFavoriteHandlers } from "./favorites.ipc";
import { registerMissionHandlers } from "./missions.ipc";
import { registerSessionHandlers } from "./sessions.ipc";

export function registerAllHandlers(): void {
  registerAgentHandlers();
  registerProjectHandlers();
  registerSpawnHandlers();
  registerEventHandlers();
  registerMemoryHandlers();
  registerCostHandlers();
  registerFavoriteHandlers();
  registerMissionHandlers();
  registerSessionHandlers();
}
