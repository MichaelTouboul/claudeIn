import type { ReactNode } from "react";

import { Spinner } from "@/components/_ui/Spinner";

export type PaneShellProps = {
  /** Accessible region name + visible heading. */
  title: string;
  /** One-line section description (kit `HEADERS`). */
  description: string;
  children: ReactNode;
};

/**
 * Standard Customize section frame: a scrollable region with the kit's section
 * header (title + one-line description) above the pane body. Shared by every
 * ecosystem pane so headers stay consistent.
 */
export function PaneShell({ title, description, children }: PaneShellProps) {
  return (
    <section aria-label={title} className="flex-1 min-h-0 overflow-y-auto px-8 py-7">
      <div className="mb-[22px] flex flex-col gap-1.5">
        <h1
          className="text-[22px] font-semibold tracking-[-0.01em]"
          style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-sans)" }}
        >
          {title}
        </h1>
        <p
          className="max-w-[60ch] text-sm leading-relaxed"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

export function PaneLoading({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-12" aria-label={label}>
      <Spinner size="sm" className="text-accent" />
      <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        {label}
      </span>
    </div>
  );
}

export function PaneEmpty({ message }: { message: string }) {
  return (
    <p className="py-12 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
      {message}
    </p>
  );
}
