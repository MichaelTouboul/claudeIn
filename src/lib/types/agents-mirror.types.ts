export type {
  AgentsSnapshot,
  AgentSummary,
} from "../../../electron/types/agents-mirror.types";

// AgentScope is an `as const` object → re-export the VALUE (not just the type)
// so the renderer can use AgentScope.Plugin etc. at runtime, while the
// same-named type travels along automatically.
export { AgentScope } from "../../../electron/types/agents-mirror.types";
