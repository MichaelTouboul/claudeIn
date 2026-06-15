import { ArrowLeft } from "lucide-react";
import { type ReactNode } from "react";

import { Button } from "@/components/_ui/Button";

import { OnbShell } from "../OnbShell/OnbShell";

/** One reassurance row in the consent checklist (what ClaudeIn reads locally). */
export type ConsentItem = {
  icon: ReactNode;
  title: string;
  detail: string;
};

type ConsentStepProps = {
  /** Position in the flow (drives the progress header). */
  stepIndex: number;
  title: string;
  /** What the upcoming search does and why — shown to the user before consent. */
  explanation: string;
  /** Optional icon-row checklist of the specific things ClaudeIn will read. */
  items?: ConsentItem[];
  /** Step back to the previous screen, if any. */
  onBack?: () => void;
  /** Grant consent and advance. There is deliberately no skip affordance. */
  onAuthorize: () => void;
};

/**
 * Shared consent screen: an explanation, an optional icon-row checklist, plus a
 * single "Authorize" action. The flow is consent-gated with NO skip option
 * anywhere — both user-info and repo searches reuse this presentational step.
 */
export function ConsentStep({
  stepIndex,
  title,
  explanation,
  items,
  onBack,
  onAuthorize,
}: ConsentStepProps) {
  return (
    <OnbShell
      stepIndex={stepIndex}
      title={title}
      subtitle={explanation}
      footer={
        <>
          {onBack !== undefined ? (
            <Button
              intent="ghost"
              size="md"
              leftIcon={<ArrowLeft size={15} aria-hidden="true" />}
              onClick={onBack}
            >
              Back
            </Button>
          ) : (
            <span />
          )}
          <Button intent="primary" size="md" onClick={onAuthorize}>
            Authorize
          </Button>
        </>
      }
    >
      {items !== undefined ? (
        <div className="flex flex-col gap-0.5">
          {items.map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-3 rounded-md p-3"
              style={{ background: "var(--color-surface-2)" }}
            >
              <span className="mt-0.5 shrink-0" style={{ color: "var(--color-accent)" }}>
                {item.icon}
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-fg">{item.title}</span>
                <span className="text-[13px] text-fg-subtle">{item.detail}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </OnbShell>
  );
}
