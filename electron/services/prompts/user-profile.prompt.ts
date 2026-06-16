import { definePrompt, PromptId } from "./prompt.types";

/**
 * User-scope narrative prompt: explores the user `.claude` dir and asks for a
 * JSON object (name / role / domains). Moved verbatim from
 * `user-search.narrative.buildUserPrompt`; the `parseNarrative` parser stays in
 * that file (it consumes the model's reply, it is not part of the prompt).
 *
 * Input: the detected other-plugin data dirs (`plugins`).
 */
const PLUGINS_NONE = "No other-plugin data dirs were detected.";

export const userProfilePrompt = definePrompt<string[]>({
  id: PromptId.UserProfileNarrative,
  version: 1,
  build: (plugins) => {
    const pluginsLine =
      plugins.length > 0
        ? `Detected plugin data dirs: ${plugins.join(", ")}.`
        : PLUGINS_NONE;
    return `Explore the user-scope \`.claude\` directory at this root — its agents, skills, MCP servers, hooks, and memory/CLAUDE.md. ${pluginsLine}

Infer the user's setup and return ONLY a JSON object with these keys:
{"name": "<the user's real name, inferred from memory files / CLAUDE.md / git config / email; null if you genuinely cannot infer it>", "role": "<a concise phrase naming the developer's main technologies / stack — the languages, frameworks, and tools they clearly use, e.g. \\"TypeScript + React + Node, with Electron and SQLite\\". Describe their TECH, NOT their employer, company name, or which monorepo they work in. null if you genuinely cannot infer it>", "stack": ["<technology>", ...], "domains": ["<tag>", ...]}

For "stack", list the INDIVIDUAL languages, frameworks, and tools the user clearly uses as separate tag strings (e.g. ["TypeScript", "Express", "React", "Node", "Nx", "MongoDB", "Elasticsearch"]) — the same TECH the "role" phrase summarizes, but split into atomic chips. Empty array if you genuinely cannot infer any.

Output ONLY the raw JSON object — no preamble, no explanation, and no markdown code fences.`;
  },
});
