import { Check, Lock } from "lucide-react";

import { Button } from "@/components/_ui/Button";

import { OnbShell } from "../OnbShell/OnbShell";

type WelcomeStepProps = {
  /** Position in the flow (drives the progress header). */
  stepIndex: number;
  /** Advance to the first consent screen. */
  onNext: () => void;
};

/** The ClaudeIn prompt-chevron brand mark, matching the home topbar. */
function BrandMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M9 8.5 L17 16 L9 23.5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M20.5 23.5 L25 23.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Step 1 — intro to the first-run experience with a single "Get started" CTA. */
export function WelcomeStep({ stepIndex, onNext }: WelcomeStepProps) {
  return (
    <OnbShell
      stepIndex={stepIndex}
      icon={<BrandMark />}
      title="Welcome to ClaudeIn"
      subtitle="A cleaner home for everything Claude Code makes invisible — your sessions, sub-agents, skills, memory and context, all in one calm workspace."
      footer={
        <>
          <span />
          <Button
            intent="primary"
            size="lg"
            rightIcon={<Check size={16} aria-hidden="true" />}
            onClick={onNext}
          >
            Get started
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-2 text-[13px] text-fg-subtle">
        <Lock size={15} aria-hidden="true" />
        None of your data leaves your machine.
      </div>
    </OnbShell>
  );
}
