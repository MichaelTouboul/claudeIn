import { type ReactElement, useCallback } from "react";

import { Button } from "@/components/_ui/Button";
import { Flex } from "@/components/_ui/Flex";
import type { UserProfile } from "@/lib/types";

import { OnbShell } from "../OnbShell/OnbShell";
import { SearchPhase } from "./searchPhase";
import { useUserSearch } from "./useUserSearch";
import { WorkingView } from "./WorkingView";

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
    [SearchPhase.Working]: () => <WorkingView />,
    [SearchPhase.LocateFailed]: () => (
      <>
        <p className="text-sm text-fg-muted">
          Couldn't find your .claude folder. Point us to it to continue.
        </p>
        <Flex justify="end">
          <Button intent="primary" size="md" onClick={() => void pickFolder()}>
            Choose the .claude folder
          </Button>
        </Flex>
      </>
    ),
    [SearchPhase.Error]: () => (
      <>
        <p className="text-sm text-danger">The analysis failed. Please try again.</p>
        <Flex justify="end">
          <Button intent="primary" size="md" onClick={() => void retry()}>
            Retry
          </Button>
        </Flex>
      </>
    ),
  };

  return <OnbShell title="Analyzing your profile">{view[phase]()}</OnbShell>;
}
