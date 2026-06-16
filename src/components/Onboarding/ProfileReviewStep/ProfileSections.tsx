import type { ReactNode } from "react";

import { Stack } from "@/components/_ui/Stack";
import { Tag } from "@/components/_ui/Tag";
import type { UserProfile } from "@/lib/types";

type SectionProps = {
  label: string;
  children: ReactNode;
};

/** An overline heading above its content (Stack / Domains sections). */
function Section({ label, children }: SectionProps) {
  return (
    <Stack gap={2.5}>
      <span
        className="text-[0.65rem] uppercase tracking-[0.12em] text-fg-subtle"
        style={{ fontFamily: "var(--font-sans)" }}
      >
        {label}
      </span>
      {children}
    </Stack>
  );
}

type ProfileSectionsProps = {
  profile: UserProfile;
};

/**
 * The two read sections under the identity card. "Stack" wraps the LLM-inferred
 * individual technologies (`profile.stack`) as tag chips, and "Domains" wraps the
 * detected domain tags as chips. Each section is omitted when its array is empty.
 */
export function ProfileSections({ profile }: ProfileSectionsProps) {
  return (
    <Stack gap={4}>
      {profile.stack.length > 0 ? (
        <Section label="Stack">
          <div className="flex flex-wrap gap-2">
            {profile.stack.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        </Section>
      ) : null}
      {profile.domains.length > 0 ? (
        <Section label="Domains">
          <div className="flex flex-wrap gap-2">
            {profile.domains.map((d) => (
              <Tag key={d}>{d}</Tag>
            ))}
          </div>
        </Section>
      ) : null}
    </Stack>
  );
}
