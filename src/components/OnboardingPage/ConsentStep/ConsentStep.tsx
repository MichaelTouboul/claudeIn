import { Button } from "@/components/_ui/Button";

import { OnbShell } from "../OnbShell/OnbShell";

type ConsentStepProps = {
  title: string;
  /** What the upcoming search does and why — shown to the user before consent. */
  explanation: string;
  /** Grant consent and advance. There is deliberately no skip affordance. */
  onAuthorize: () => void;
};

/**
 * Shared consent screen: an explanation plus a single "Authorize" action. The
 * flow is consent-gated with NO skip option anywhere — both user-info and repo
 * searches reuse this presentational step.
 */
export function ConsentStep({ title, explanation, onAuthorize }: ConsentStepProps) {
  return (
    <OnbShell title={title}>
      <p className="text-sm text-fg-muted">{explanation}</p>
      <div className="flex justify-end">
        <Button intent="primary" size="md" onClick={onAuthorize}>
          Authorize
        </Button>
      </div>
    </OnbShell>
  );
}
