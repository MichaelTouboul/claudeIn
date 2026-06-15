import type { ReactNode } from "react";

import { Badge } from "@/components/_ui/Badge";
import { Inline } from "@/components/_ui/Inline";
import { Stack } from "@/components/_ui/Stack";

type ProfileSectionProps = {
  label: string;
  children: ReactNode;
};

/** A labelled read-only section: an uppercase sans overline heading above its content. */
export function ProfileSection({ label, children }: ProfileSectionProps) {
  return (
    <Stack gap={1.5}>
      <span
        className="text-[0.65rem] uppercase tracking-[0.12em] text-fg-subtle"
        style={{ fontFamily: "var(--font-sans)" }}
      >
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

/** A wrapped list of tag pills, with an empty-state fallback. */
export function TagList({ items, empty }: TagListProps) {
  if (items.length === 0) {
    return <span className="text-fg-subtle">{empty}</span>;
  }
  return (
    <Inline gap={1.5} className="flex-wrap">
      {items.map((item) => (
        <Badge key={item} variant="gray" shape="pill">
          {item}
        </Badge>
      ))}
    </Inline>
  );
}
