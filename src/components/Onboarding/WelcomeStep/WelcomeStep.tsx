import { Button } from "@/components/_ui/Button";
import { Flex } from "@/components/_ui/Flex";

import { OnbShell } from "../OnbShell/OnbShell";

type WelcomeStepProps = {
  /** Advance to the first consent screen. */
  onNext: () => void;
};

/** Step 1 — intro to the first-run experience with a single "Get started" CTA. */
export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <OnbShell
      title="Welcome to ClaudeIn"
      subtitle="A few steps to set up your workspace."
    >
      <p className="text-sm text-fg-muted">
        ClaudeIn analyzes your local Claude Code setup to give you a tailored experience. None of
        your data leaves your machine.
      </p>
      <Flex justify="end">
        <Button intent="primary" size="md" onClick={onNext}>
          Get started
        </Button>
      </Flex>
    </OnbShell>
  );
}
