import { ConsentStep } from "../ConsentStep/ConsentStep";

type ConsentReposStepProps = {
  /** Authorize the repo search and advance to ReposPick. */
  onAuthorize: () => void;
};

/** Step 5 — explain the repo search and ask for consent (no skip). */
export function ConsentReposStep({ onAuthorize }: ConsentReposStepProps) {
  return (
    <ConsentStep
      title="Find your repositories"
      explanation="ClaudeIn will scan your local code folders to detect repositories that use Claude Code. You'll then pick your favorites. Everything stays local."
      onAuthorize={onAuthorize}
    />
  );
}
