import { useState } from "react";

import { Button } from "@/components/_ui/Button";

import { OnbShell } from "../OnbShell/OnbShell";

type DoneStepProps = {
  /** Finalize onboarding (completeOnboarding) and navigate home. */
  onFinish: () => void;
};

/**
 * Step 7 — confirmation; "Finish" completes onboarding and enters the app.
 * The button disables itself on click so the async completion can't be
 * double-triggered, and announces its busy state for assistive tech.
 */
export function DoneStep({ onFinish }: DoneStepProps) {
  const [finishing, setFinishing] = useState(false);

  return (
    <OnbShell title="All set" subtitle="Your workspace is ready.">
      <p className="text-sm text-fg-muted">
        You can find and edit your profile and favorite repositories at any time from the home
        screen.
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
          {finishing ? "Finishing…" : "Finish"}
        </Button>
      </div>
    </OnbShell>
  );
}
