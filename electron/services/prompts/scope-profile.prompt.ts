import { definePrompt, PromptId } from "./prompt.types";

/** Inputs for the scope-profile prompt: the Node-gathered `.claude` context block. */
export type ScopeProfileInput = { context: string };

/**
 * Scope-profile markdown prompt. The run now executes in a throwaway tmp cwd
 * (never the scope) so it can't leak a `.jsonl` transcript into a scanned
 * project, so the scope's `.claude` setup is gathered in Node
 * (`buildScopeContext`) and injected here as `context` — mirroring
 * `repoLabelPrompt`. v2 no longer instructs the agent to explore the filesystem.
 */
export const scopeProfilePrompt = definePrompt<ScopeProfileInput>({
  id: PromptId.ScopeProfile,
  version: 2,
  build: ({ context }) =>
    `Below is a plain-text snapshot of a Claude Code setup's \`.claude\` directory — its agents, skills, MCP/settings, hooks, memory/CLAUDE.md, and any other-plugin data dirs.

Produce a concise narrative markdown profile of this setup: what's configured, what each major piece is for, and how the pieces fit together. Output only the profile.

${context}`,
});
