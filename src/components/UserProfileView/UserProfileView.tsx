import { useState } from "react";

import { Button } from "@/components/_ui/Button";
import { Inline } from "@/components/_ui/Inline";
import { Stack } from "@/components/_ui/Stack";
import type { UserProfile } from "@/lib/types";

import { ProfileHeader } from "./ProfileHeader";
import { ProfileSection, TagList } from "./ProfileRow";
import { UserProfileEdit } from "./UserProfileEdit";

type UserProfileViewProps = {
  profile: UserProfile | null;
  onSave: (next: UserProfile) => Promise<UserProfile>;
};

/**
 * Read + inline-edit view of the user profile. A header identity block (name,
 * role, path, capability chips, plugins) sits above readable narrative sections
 * (Summary / Domains / Workflow). Deterministic fields are read-only; narrative +
 * identity fields are editable via `UserProfileEdit`. Reused on Home and the
 * onboarding ProfileReview.
 */
export function UserProfileView({ profile, onSave }: UserProfileViewProps) {
  const [editing, setEditing] = useState(false);

  if (profile === null) {
    return <p className="text-sm text-fg-subtle">No profile yet.</p>;
  }

  if (editing) {
    return (
      <UserProfileEdit
        profile={profile}
        onSave={async (next) => {
          const saved = await onSave(next);
          setEditing(false);
          return saved;
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <Stack gap={4}>
      <Inline gap={2} align="start" justify="between">
        <h2 className="text-sm font-semibold text-fg" style={{ fontFamily: "var(--font-mono)" }}>
          My profile
        </h2>
        <Button intent="outline" size="sm" onClick={() => setEditing(true)}>
          Edit
        </Button>
      </Inline>

      <ProfileHeader profile={profile} />

      <Stack gap={4} className="border-t border-border-subtle pt-4">
        <ProfileSection label="Summary">
          <p className="max-w-prose leading-relaxed text-fg-muted">{profile.summary ?? "—"}</p>
        </ProfileSection>
        <ProfileSection label="Domains">
          <TagList items={profile.domains} empty="—" />
        </ProfileSection>
        <ProfileSection label="Workflow">
          <p className="max-w-prose leading-relaxed text-fg-muted">{profile.workflow ?? "—"}</p>
        </ProfileSection>
      </Stack>
    </Stack>
  );
}
