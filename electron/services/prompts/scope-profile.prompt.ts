import { definePrompt, PromptId } from "./prompt.types";

/**
 * Scope-profile markdown prompt: explores a scope's `.claude` dir and asks for a
 * concise narrative markdown profile. Moved verbatim from
 * `profile.service.buildPrompt`.
 *
 * Input: the detected other-plugin data dirs (`plugins`).
 */
export const scopeProfilePrompt = definePrompt<string[]>({
  id: PromptId.ScopeProfile,
  version: 1,
  build: (plugins) => {
    const pluginsLine =
      plugins.length > 0
        ? `The following other-plugin data dirs were detected alongside it: ${plugins.join(", ")}.`
        : "No other-plugin data dirs were detected.";
    return `Explore the \`.claude\` directory at this root on your own — its agents, skills, MCP servers, hooks, and memory/CLAUDE.md. ${pluginsLine}

Produce a concise narrative markdown profile of this setup: what's configured, what each major piece is for, and how the pieces fit together. Output only the profile.`;
  },
});
