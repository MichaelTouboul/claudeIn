import { definePrompt, PromptId } from "./prompt.types";

/** Inputs for the per-repo label prompt: the Node-gathered repo context block. */
export type RepoLabelInput = { context: string };

/**
 * Per-repo one-line label shown on the Home page. The run now executes in a
 * throwaway tmp cwd (never the repo) so it can't leak a `.jsonl` transcript into
 * a scanned project, so the repo's `.claude` setup and top-level files are
 * gathered in Node (`buildRepoLabelContext`) and injected here as `context`.
 */
export const repoLabelPrompt = definePrompt<RepoLabelInput>({
  id: PromptId.RepoLabel,
  version: 2,
  build: ({ context }) =>
    `In one short sentence, describe what this repository is and does, based on its \`.claude\` setup and top-level files. Output only that sentence.

${context}`,
});
