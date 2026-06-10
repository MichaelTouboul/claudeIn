import { registerAgentHandlers } from "./agents.ipc";
import { registerSkillHandlers } from "./skills.ipc";
import { registerMcpHandlers } from "./mcp.ipc";
import { registerProjectHandlers } from "./projects.ipc";
import { registerSpawnHandlers } from "./spawn.ipc";
import { registerEventHandlers } from "./events.ipc";
import { registerMemoryHandlers } from "./memory.ipc";
import { registerFavoriteHandlers } from "./favorites.ipc";
import { registerSessionHandlers } from "./sessions.ipc";
import { registerConversationMetaHandlers } from "./conversation.meta.ipc";
import { registerDialogHandlers } from "./dialog.ipc";
import { registerPtyHandlers } from "./pty.ipc";
import { registerSystemHandlers } from "./system.ipc";
import { registerSettingsHandlers } from "./settings.ipc";
import { registerActivityHandlers } from "./activity.ipc";
import { registerTransformHandlers } from "./transform.ipc";
import { registerOnboardingHandlers } from "./onboarding.ipc";

export function registerAllHandlers(): void {
  registerAgentHandlers();
  registerSkillHandlers();
  registerMcpHandlers();
  registerProjectHandlers();
  registerSpawnHandlers();
  registerEventHandlers();
  registerMemoryHandlers();
  registerFavoriteHandlers();
  registerSessionHandlers();
  registerConversationMetaHandlers();
  registerDialogHandlers();
  registerPtyHandlers();
  registerSystemHandlers();
  registerSettingsHandlers();
  registerActivityHandlers();
  registerTransformHandlers();
  registerOnboardingHandlers();
}
