import { Button } from "@/components/_ui/Button";
import { UserProfileView } from "@/components/UserProfileView/UserProfileView";
import type { UserProfile } from "@/lib/types";

import { OnbShell } from "../OnbShell/OnbShell";

type ProfileReviewStepProps = {
  /** Position in the flow (drives the progress header). */
  stepIndex: number;
  profile: UserProfile | null;
  /** Persist edits made in the embedded `UserProfileView`. */
  onSave: (next: UserProfile) => Promise<UserProfile>;
  /** Confirm the profile and advance to the repo consent. */
  onConfirm: () => void;
};

/**
 * Step 4 — review the built profile via the reusable, editable `UserProfileView`
 * and confirm. Identity/narrative fields are editable; deterministic fields are
 * read-only (enforced inside `UserProfileView`).
 */
export function ProfileReviewStep({
  stepIndex,
  profile,
  onSave,
  onConfirm,
}: ProfileReviewStepProps) {
  return (
    <OnbShell
      stepIndex={stepIndex}
      title="Your profile"
      subtitle="Review and adjust the details before continuing."
      footer={
        <>
          <span />
          <Button intent="primary" size="md" onClick={onConfirm}>
            Confirm
          </Button>
        </>
      }
    >
      <UserProfileView profile={profile} onSave={onSave} />
    </OnbShell>
  );
}
