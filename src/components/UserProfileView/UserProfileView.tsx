import { useState } from "react";

import { Button } from "@/components/_ui/Button";
import { Inline } from "@/components/_ui/Inline";
import { Stack } from "@/components/_ui/Stack";
import type { UserProfile } from "@/lib/types";

import { ProfileRow, TagList } from "./ProfileRow";
import { UserProfileEdit } from "./UserProfileEdit";

type UserProfileViewProps = {
  profile: UserProfile | null;
  onSave: (next: UserProfile) => Promise<UserProfile>;
};

function caps(profile: UserProfile): string {
  const { agents, skills, mcp, hooks } = profile.capabilities;
  return `${agents.count} agents · ${skills} skills · ${mcp} MCP · ${hooks} hooks`;
}

/**
 * Read + inline-edit view of the user profile. Deterministic fields (paths,
 * counts, plugins) are read-only; narrative + identity fields are editable via
 * `UserProfileEdit`. Reused on Home and (later) the onboarding ProfileReview.
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

      <ProfileRow label="Identity">
        <span>{profile.name ?? "—"}</span>
        {profile.role !== null ? <span className="text-fg-subtle"> · {profile.role}</span> : null}
      </ProfileRow>
      <ProfileRow label=".claude folder">
        <span style={{ fontFamily: "var(--font-mono)" }}>{profile.claudeUserPath ?? "—"}</span>
      </ProfileRow>
      <ProfileRow label="Plugins">
        <TagList items={profile.plugins} empty="none" />
      </ProfileRow>
      <ProfileRow label="Capabilities">
        <span style={{ fontFamily: "var(--font-mono)" }}>{caps(profile)}</span>
      </ProfileRow>
      <ProfileRow label="Summary">
        <span>{profile.summary ?? "—"}</span>
      </ProfileRow>
      <ProfileRow label="Domains">
        <TagList items={profile.domains} empty="—" />
      </ProfileRow>
      <ProfileRow label="Workflow">
        <span>{profile.workflow ?? "—"}</span>
      </ProfileRow>
    </Stack>
  );
}
