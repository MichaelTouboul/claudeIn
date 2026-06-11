import { Button } from "@/components/_ui/Button";

import { OnbShell } from "../OnbShell/OnbShell";

type WelcomeStepProps = {
  /** Advance to the first consent screen. */
  onNext: () => void;
};

/** Step 1 — intro to the first-run experience with a single "Commencer" CTA. */
export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <OnbShell
      title="Bienvenue dans ClaudeIn"
      subtitle="Quelques étapes pour préparer votre espace de travail."
    >
      <p className="text-sm text-fg-muted">
        ClaudeIn analyse votre configuration Claude Code locale pour vous offrir une expérience sur
        mesure. Aucune donnée ne quitte votre machine.
      </p>
      <div className="flex justify-end">
        <Button intent="primary" size="md" onClick={onNext}>
          Commencer
        </Button>
      </div>
    </OnbShell>
  );
}
