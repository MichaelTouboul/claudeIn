import { ConsentStep } from "../ConsentStep/ConsentStep";

type ConsentReposStepProps = {
  /** Authorize the repo search and advance to ReposPick. */
  onAuthorize: () => void;
};

/** Step 5 — explain the repo search and ask for consent (no skip). */
export function ConsentReposStep({ onAuthorize }: ConsentReposStepProps) {
  return (
    <ConsentStep
      title="Trouver vos dépôts"
      explanation="ClaudeIn va parcourir vos dossiers de code locaux pour repérer les dépôts utilisant Claude Code. Vous choisirez ensuite vos favoris. Tout reste local."
      onAuthorize={onAuthorize}
    />
  );
}
