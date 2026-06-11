import { type ReactElement, useCallback } from "react";

import { Button } from "@/components/_ui/Button";
import { Progress } from "@/components/_ui/Progress";
import type { UserProfile } from "@/types/user.types";

import { OnbShell } from "../OnbShell/OnbShell";
import { SearchPhase } from "./searchPhase";
import { useUserSearch } from "./useUserSearch";

type SearchUserStepProps = {
  /** Receives the built profile; the page advances to ProfileReview. */
  onProfile: (profile: UserProfile) => void;
};

/**
 * Step 3 — locate `.claude` and build the profile with a progress UI. On a null
 * locate it prompts the user to point to the folder (picker) then retries; a
 * rejection offers a retry. Phase→view via a `Record` (no fallback chains).
 */
export function SearchUserStep({ onProfile }: SearchUserStepProps) {
  const { phase, buildFrom, retry } = useUserSearch(onProfile);

  const pickFolder = useCallback(async () => {
    const dir = await window.api.openDirectoryPicker();
    if (dir === null) return;
    await buildFrom(dir);
  }, [buildFrom]);

  const view: Record<SearchPhase, () => ReactElement> = {
    [SearchPhase.Working]: () => (
      <>
        <p className="text-sm text-fg-muted">Analyse de votre configuration en cours…</p>
        <Progress value={0.6} fillColor="var(--color-accent)" className="h-1.5 w-full" />
      </>
    ),
    [SearchPhase.LocateFailed]: () => (
      <>
        <p className="text-sm text-fg-muted">
          Dossier .claude introuvable. Indiquez son emplacement pour continuer.
        </p>
        <div className="flex justify-end">
          <Button intent="primary" size="md" onClick={() => void pickFolder()}>
            Choisir le dossier .claude
          </Button>
        </div>
      </>
    ),
    [SearchPhase.Error]: () => (
      <>
        <p className="text-sm text-danger">L’analyse a échoué. Réessayez.</p>
        <div className="flex justify-end">
          <Button intent="primary" size="md" onClick={() => void retry()}>
            Réessayer
          </Button>
        </div>
      </>
    ),
  };

  return <OnbShell title="Analyse de votre profil">{view[phase]()}</OnbShell>;
}
