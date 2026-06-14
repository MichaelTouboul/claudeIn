import type { ReactNode } from "react";

import { Stack } from "@/components/_ui/Stack";

type ProfileRowProps = {
  label: string;
  children: ReactNode;
};

/** A labelled read-only profile row (label column + value). */
export function ProfileRow({ label, children }: ProfileRowProps) {
  return (
    <Stack gap={1}>
      <span className="text-[0.65rem] uppercase tracking-[0.12em] text-fg-subtle" style={{ fontFamily: "var(--font-mono)" }}>
        {label}
      </span>
      <div className="text-sm text-fg" style={{ fontFamily: "var(--font-sans)" }}>
        {children}
      </div>
    </Stack>
  );
}

type TagListProps = {
  items: string[];
  empty: string;
};

/** A wrapped list of tag chips, with an empty-state fallback. */
export function TagList({ items, empty }: TagListProps) {
  if (items.length === 0) {
    return <span className="text-fg-subtle">{empty}</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="rounded bg-surface-2 px-2 py-0.5 text-xs text-fg-muted"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}
