import { Check, Sparkles } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/_ui/Badge";
import { Button } from "@/components/_ui/Button";

import { OnbShell } from "../OnbShell/OnbShell";

type DoneStepProps = {
  /** Position in the flow (drives the progress header). */
  stepIndex: number;
  /** Finalize onboarding (completeOnboarding) and navigate home. */
  onFinish: () => void;
};

/**
 * Step 7 — confirmation; "Finish" completes onboarding and enters the app.
 * Centered success screen matching the design-system onboarding kit. The button
 * disables itself on click so the async completion can't be double-triggered, and
 * announces its busy state for assistive tech.
 */
export function DoneStep({ stepIndex, onFinish }: DoneStepProps) {
  const [finishing, setFinishing] = useState(false);

  return (
    <OnbShell
      stepIndex={stepIndex}
      centered
      title="You're all set"
      subtitle="Your workspace is ready. You can find and edit your profile and favorite repositories at any time from the home screen."
      footer={
        <>
          <span />
          <Button
            intent="primary"
            size="lg"
            rightIcon={<Sparkles size={16} aria-hidden="true" />}
            disabled={finishing}
            aria-busy={finishing}
            onClick={() => {
              setFinishing(true);
              onFinish();
            }}
          >
            {finishing ? "Finishing…" : "Open ClaudeIn"}
          </Button>
        </>
      }
    >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{
          background: "var(--color-surface-2)",
          border: "1px solid color-mix(in srgb, var(--color-active) 35%, transparent)",
          color: "var(--color-active)",
        }}
      >
        <Check size={28} aria-hidden="true" />
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="green" shape="pill" dot>
          ready
        </Badge>
        <Badge variant="cyan" shape="pill">
          on-device
        </Badge>
      </div>
    </OnbShell>
  );
}
