import { type ReactNode } from "react";

import { OnbSteps } from "./OnbSteps";

type OnbShellProps = {
  /** Accessible name for the step's labelled region; also the card heading. */
  title: string;
  /** Optional short lead paragraph under the title. */
  subtitle?: string;
  /** Zero-based index of the active step (drives the progress header). */
  stepIndex: number;
  /** Optional brand/identity glyph shown left of the title. */
  icon?: ReactNode;
  /** The step's primary content. */
  children: ReactNode;
  /**
   * Footer actions (CTAs). Rendered in a bordered footer band; omit for steps
   * that have no actions (e.g. the live analyzing screen).
   */
  footer?: ReactNode;
  /** Center the body content + heading (used by the welcome / done screens). */
  centered?: boolean;
};

/**
 * Shared card shell for an onboarding step, matching the ClaudeIn design-system
 * onboarding kit: a fixed-width card on the full-bleed surface with a step
 * progress header, a content body, and an optional bordered footer for CTAs.
 * The page owns the dialog role; each step is a labelled `section` so screen
 * readers announce the current screen.
 */
export function OnbShell({
  title,
  subtitle,
  stepIndex,
  icon,
  children,
  footer,
  centered = false,
}: OnbShellProps) {
  return (
    <section
      aria-label={title}
      className="w-full max-w-[560px] overflow-hidden rounded-xl border border-border"
      style={{ background: "var(--color-surface-1)", boxShadow: "var(--shadow-lg)" }}
    >
      <OnbSteps stepIndex={stepIndex} />

      <div
        className={
          centered
            ? "flex flex-col items-center gap-5 px-8 py-8 text-center"
            : "flex flex-col gap-5 px-8 py-8"
        }
      >
        <div className={centered ? "flex flex-col items-center gap-3" : "flex items-center gap-3"}>
          {icon !== undefined ? (
            <span className="shrink-0" style={{ color: "var(--color-accent)" }}>
              {icon}
            </span>
          ) : null}
          <h2 className="text-[22px] font-semibold tracking-[-0.01em] text-fg">{title}</h2>
        </div>
        {subtitle !== undefined ? (
          <p className="text-[15px] leading-relaxed text-fg-muted" style={centered ? { maxWidth: "44ch" } : undefined}>
            {subtitle}
          </p>
        ) : null}
        {children}
      </div>

      {footer !== undefined ? (
        <div
          className="flex items-center justify-between gap-3 border-t border-border-subtle px-8 py-[18px]"
          style={{ background: "var(--color-surface-1)" }}
        >
          {footer}
        </div>
      ) : null}
    </section>
  );
}
