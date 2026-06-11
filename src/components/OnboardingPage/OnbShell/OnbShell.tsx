import { type ReactNode } from "react";

type OnbShellProps = {
  /** Accessible name for the step's labelled region. */
  title: string;
  /** Optional short subtitle under the title. */
  subtitle?: string;
  children: ReactNode;
};

/**
 * Shared layout for an onboarding step: a centered card on the full-bleed
 * onboarding surface. The page itself owns the dialog role; each step is a
 * labelled `section` inside it so screen readers announce the current screen.
 */
export function OnbShell({ title, subtitle, children }: OnbShellProps) {
  return (
    <section
      aria-label={title}
      className="w-full max-w-xl rounded-lg p-8 shadow-2xl"
      style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-border)" }}
    >
      <h2
        className="text-lg font-semibold tracking-[0.02em] text-fg"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {title}
      </h2>
      {subtitle !== undefined ? <p className="mt-2 text-sm text-fg-muted">{subtitle}</p> : null}
      <div className="mt-6 flex flex-col gap-4">{children}</div>
    </section>
  );
}
