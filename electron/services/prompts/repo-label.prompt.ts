import { definePrompt, PromptId } from "./prompt.types";

/**
 * Per-repo one-line label shown on the Home page. The repo's `.claude` setup and
 * top-level files are the context (the run executes with `cwd = repo`), so the
 * prompt itself takes no input. Moved verbatim from `repos.service.labelPrompt`.
 */
export const repoLabelPrompt = definePrompt<void>({
  id: PromptId.RepoLabel,
  version: 1,
  build: () =>
    "In one short sentence, describe what this repository is and does, based on its `.claude` setup and top-level files. Output only that sentence.",
});
