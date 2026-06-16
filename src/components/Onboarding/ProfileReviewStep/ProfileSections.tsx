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
 * The two read sections under the identity card. "Stack" surfaces the LLM `role`
 * sentence as a single readable line (it is prose, not a tag array), while
 * "Domains" wraps the detected domain tags as chips.
 */
export function ProfileSections({ profile }: ProfileSectionsProps) {
  return (
    <Stack gap={4}>
      {profile.role !== null ? (
        <Section label="Stack">
          <p className="text-sm leading-relaxed text-fg-muted">{profile.role}</p>
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
