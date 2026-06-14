import { Badge } from "@/components/_ui/Badge";
import { Inline } from "@/components/_ui/Inline";
import { Stack } from "@/components/_ui/Stack";
import type { UserProfile } from "@/lib/types";

import { StatChips } from "./StatChips";

type ProfileHeaderProps = {
  profile: UserProfile;
};

/**
 * Identity block: prominent name, role beneath, the `.claude` path in subtle
 * mono, detected plugins as pills, and the capability counts as stat chips.
 */
export function ProfileHeader({ profile }: ProfileHeaderProps) {
  return (
    <Stack
      gap={3}
      className="rounded-lg border border-border bg-surface-2 p-4"
    >
      <Stack gap={1}>
        <span
          className="text-lg font-semibold text-fg"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {profile.name ?? "Unnamed user"}
        </span>
        {profile.role !== null ? (
          <span className="text-sm text-fg-muted">{profile.role}</span>
        ) : null}
        <span
          className="text-xs text-fg-subtle"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {profile.claudeUserPath ?? "—"}
        </span>
      </Stack>

      <StatChips capabilities={profile.capabilities} />

      {profile.plugins.length > 0 ? (
        <Inline gap={1.5} className="flex-wrap">
          {profile.plugins.map((p) => (
            <Badge key={p} variant="purple" shape="pill">
              {p}
            </Badge>
          ))}
        </Inline>
      ) : null}
    </Stack>
  );
}
