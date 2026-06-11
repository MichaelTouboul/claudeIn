import { Button } from "@/components/_ui/Button";

import { OnbShell } from "../OnbShell/OnbShell";

type DoneStepProps = {
  /** Finalize onboarding (completeOnboarding) and navigate home. */
  onFinish: () => void;
};

/** Step 7 — confirmation; "Terminer" completes onboarding and enters the app. */
export function DoneStep({ onFinish }: DoneStepProps) {
  return (
    <OnbShell title="Tout est prêt" subtitle="Votre espace de travail est configuré.">
      <p className="text-sm text-fg-muted">
        Vous pouvez retrouver et modifier votre profil et vos dépôts favoris à tout moment depuis
        l’accueil.
      </p>
      <div className="flex justify-end">
        <Button intent="primary" size="md" onClick={onFinish}>
          Terminer
        </Button>
      </div>
    </OnbShell>
  );
}
