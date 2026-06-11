import { ConsentStep } from "../ConsentStep/ConsentStep";

type ConsentUserStepProps = {
  /** Authorize the user-info search and advance to SearchUser. */
  onAuthorize: () => void;
};

/** Step 2 — explain the user-info search and ask for consent (no skip). */
export function ConsentUserStep({ onAuthorize }: ConsentUserStepProps) {
  return (
    <ConsentStep
      title="Analyser votre profil"
      explanation="ClaudeIn va localiser votre dossier .claude et résumer votre configuration (agents, skills, MCP, hooks) pour construire votre profil. Tout reste local."
      onAuthorize={onAuthorize}
    />
  );
}
