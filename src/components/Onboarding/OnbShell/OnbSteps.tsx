import { OnbStep } from "../onbStep";

/** Total number of onboarding steps — derived from the flow enum so it stays in sync. */
const STEP_COUNT = Object.keys(OnbStep).length;

type OnbStepsProps = {
  /** Zero-based index of the active step. */
  stepIndex: number;
};

/**
 * The onboarding card's progress header: one short segment per step (filled for
 * done, solid for the current step, muted ahead) plus a mono "Step n of N"
 * marker. Decorative — the labelled `section` per step carries the real a11y
 * announcement — so the segments are `aria-hidden`.
 */
export function OnbSteps({ stepIndex }: OnbStepsProps) {
  return (
    <div className="flex items-center gap-2 border-b border-border-subtle px-8 py-[18px]">
      <div className="flex items-center gap-2" aria-hidden="true">
        {Array.from({ length: STEP_COUNT }, (_, i) => (
          <span
            key={i}
            className="h-1 w-6 rounded-full transition-[background-color] duration-[var(--duration-base)] ease-[var(--ease-standard)]"
            style={{
              background:
                i === stepIndex
                  ? "var(--color-accent-solid)"
                  : i < stepIndex
                    ? "var(--color-accent)"
                    : "var(--color-surface-3)",
            }}
          />
        ))}
      </div>
      <span
        className="ml-auto text-[11px] text-fg-subtle"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        Step {Math.min(stepIndex + 1, STEP_COUNT)} of {STEP_COUNT}
      </span>
    </div>
  );
}
