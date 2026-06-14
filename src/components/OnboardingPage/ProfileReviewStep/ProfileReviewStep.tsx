import { Button } from "@/components/_ui/Button";
import { UserProfileView } from "@/components/UserProfileView/UserProfileView";
import type { UserProfile } from "@/lib/types";

import { OnbShell } from "../OnbShell/OnbShell";

type ProfileReviewStepProps = {
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
export function ProfileReviewStep({ profile, onSave, onConfirm }: ProfileReviewStepProps) {
  return (
    <OnbShell
      title="Votre profil"
      subtitle="Vérifiez et ajustez les informations avant de continuer."
    >
      <UserProfileView profile={profile} onSave={onSave} />
      <div className="flex justify-end">
        <Button intent="primary" size="md" onClick={onConfirm}>
          Confirmer
        </Button>
      </div>
    </OnbShell>
  );
}
