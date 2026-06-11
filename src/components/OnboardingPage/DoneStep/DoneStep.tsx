import { useState } from "react";

import { Button } from "@/components/_ui/Button";

import { OnbShell } from "../OnbShell/OnbShell";

type DoneStepProps = {
  /** Finalize onboarding (completeOnboarding) and navigate home. */
  onFinish: () => void;
};

/**
 * Step 7 — confirmation; "Terminer" completes onboarding and enters the app.
 * The button disables itself on click so the async completion can't be
 * double-triggered, and announces its busy state for assistive tech.
 */
export function DoneStep({ onFinish }: DoneStepProps) {
  const [finishing, setFinishing] = useState(false);

  return (
    <OnbShell title="Tout est prêt" subtitle="Votre espace de travail est configuré.">
      <p className="text-sm text-fg-muted">
        Vous pouvez retrouver et modifier votre profil et vos dépôts favoris à tout moment depuis
        l’accueil.
      </p>
      <div className="flex justify-end">
        <Button
          intent="primary"
          size="md"
          disabled={finishing}
          aria-busy={finishing}
          onClick={() => {
            setFinishing(true);
            onFinish();
          }}
        >
          {finishing ? "Finalisation…" : "Terminer"}
        </Button>
      </div>
    </OnbShell>
  );
}
