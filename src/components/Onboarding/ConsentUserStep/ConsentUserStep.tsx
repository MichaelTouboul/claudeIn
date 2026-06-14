import { ConsentStep } from "../ConsentStep/ConsentStep";

type ConsentUserStepProps = {
  /** Authorize the user-info search and advance to SearchUser. */
  onAuthorize: () => void;
};

/** Step 2 — explain the user-info search and ask for consent (no skip). */
export function ConsentUserStep({ onAuthorize }: ConsentUserStepProps) {
  return (
    <ConsentStep
      title="Analyze your profile"
      explanation="ClaudeIn will locate your .claude folder and summarize your setup (agents, skills, MCP, hooks) to build your profile. Everything stays local."
      onAuthorize={onAuthorize}
    />
  );
}
