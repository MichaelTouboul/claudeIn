import { type ReactElement, useCallback } from "react";

import { Button } from "@/components/_ui/Button";
import type { UserProfile } from "@/lib/types";

import { OnbShell } from "../OnbShell/OnbShell";
import { SearchPhase } from "./searchPhase";
import { useUserSearch } from "./useUserSearch";
import { WorkingView } from "./WorkingView";

type SearchUserStepProps = {
  /** Position in the flow (drives the progress header). */
  stepIndex: number;
  /** Receives the built profile; the page advances to ProfileReview. */
  onProfile: (profile: UserProfile) => void;
};

type PhaseView = {
  /** Heading for the card while in this phase. */
  title: string;
  /** Body content. */
  body: ReactElement;
  /** Footer actions, if any (the live working phase has none). */
  footer?: ReactElement;
};

/**
 * Step 3 — locate `.claude` and build the profile with a progress UI. On a null
 * locate it prompts the user to point to the folder (picker) then retries; a
 * rejection offers a retry. Phase→view via a `Record` (no fallback chains).
 */
export function SearchUserStep({ stepIndex, onProfile }: SearchUserStepProps) {
  const { phase, buildFrom, retry } = useUserSearch(onProfile);

  const pickFolder = useCallback(async () => {
    const dir = await window.api.openDirectoryPicker();
    if (dir === null) return;
    await buildFrom(dir);
  }, [buildFrom]);

  const view: Record<SearchPhase, () => PhaseView> = {
    [SearchPhase.Working]: () => ({
      title: "Analyzing your setup",
      body: <WorkingView />,
    }),
    [SearchPhase.LocateFailed]: () => ({
      title: "Point us to your .claude folder",
      body: (
        <p className="text-sm text-fg-muted">
          We couldn't find your .claude folder automatically. Choose it to continue.
        </p>
      ),
      footer: (
        <>
          <span />
          <Button intent="primary" size="md" onClick={() => void pickFolder()}>
            Choose the .claude folder
          </Button>
        </>
      ),
    }),
    [SearchPhase.Error]: () => ({
      title: "Analysis failed",
      body: <p className="text-sm" style={{ color: "var(--color-danger)" }}>The analysis failed. Please try again.</p>,
      footer: (
        <>
          <span />
          <Button intent="primary" size="md" onClick={() => void retry()}>
            Retry
          </Button>
        </>
      ),
    }),
  };

  const v = view[phase]();
  return (
    <OnbShell stepIndex={stepIndex} title={v.title} footer={v.footer}>
      {v.body}
    </OnbShell>
  );
}
