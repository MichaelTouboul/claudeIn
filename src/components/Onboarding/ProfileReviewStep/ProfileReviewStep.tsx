import { Check } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/_ui/Button";
import { Stack } from "@/components/_ui/Stack";
import { UserProfileEdit } from "@/components/UserProfileView/UserProfileEdit";
import type { UserProfile } from "@/lib/types";

import { OnbShell } from "../OnbShell/OnbShell";
import { ProfileIdentityCard } from "./ProfileIdentityCard";
import { ProfileSections } from "./ProfileSections";

type ProfileReviewStepProps = {
  /** Position in the flow (drives the progress header). */
  stepIndex: number;
  profile: UserProfile | null;
  /** Persist edits made in the inline `UserProfileEdit`. */
  onSave: (next: UserProfile) => Promise<UserProfile>;
  /** Confirm the profile and advance to the repo consent. */
  onConfirm: () => void;
};

/**
 * Step 4 — review the scanned profile. The refined layout leads with an identity
 * card + a capability stat strip, then surfaces the LLM "Stack" sentence and the
 * detected "Domains" chips. "Edit" swaps the read view for the reusable
 * `UserProfileEdit` form (deterministic fields stay untouched there); confirming
 * advances. The shared `UserProfileView` (Home/Customize) is left untouched.
 */
export function ProfileReviewStep({
  stepIndex,
  profile,
  onSave,
  onConfirm,
}: ProfileReviewStepProps) {
  const [editing, setEditing] = useState(false);

  const body =
    profile === null ? (
      <p className="text-sm text-fg-subtle">No profile yet.</p>
    ) : editing ? (
      <UserProfileEdit
        profile={profile}
        onSave={async (next) => {
          const saved = await onSave(next);
          setEditing(false);
          return saved;
        }}
        onCancel={() => setEditing(false)}
      />
    ) : (
      <Stack gap={6}>
        <ProfileIdentityCard profile={profile} onEdit={() => setEditing(true)} />
        <ProfileSections profile={profile} />
      </Stack>
    );

  return (
    <OnbShell
      stepIndex={stepIndex}
      title="Your profile"
      subtitle="Here's what ClaudeIn picked up from your setup. Review it, then confirm."
      footer={
        editing ? undefined : (
          <>
            <span />
            <Button
              intent="primary"
              size="md"
              rightIcon={<Check size={16} aria-hidden="true" />}
              onClick={onConfirm}
            >
              Confirm &amp; continue
            </Button>
          </>
        )
      }
    >
      {body}
    </OnbShell>
  );
}
