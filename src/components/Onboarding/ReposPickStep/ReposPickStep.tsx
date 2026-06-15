import { FolderPlus } from "lucide-react";

import { Button } from "@/components/_ui/Button";

import { OnbShell } from "../OnbShell/OnbShell";
import { RepoCard } from "./RepoCard";
import { ReposWorkingView } from "./ReposWorkingView";
import { useReposPick } from "./useReposPick";

type ReposPickStepProps = {
  /** Position in the flow (drives the progress header). */
  stepIndex: number;
  /** Advance to the final Done screen. */
  onNext: () => void;
};

/**
 * Step 6 — list scanned repos (with detected logos + LLM labels) as favorite
 * cards, plus an "Add a folder" picker. While the scan runs the body shows an
 * indeterminate progress bar with cycling status messages and the footer actions
 * are hidden, so the user can't continue mid-search. Favorites persist
 * immediately via the favoriteRepos IPC (see `useReposPick`); "Continue" advances.
 */
export function ReposPickStep({ stepIndex, onNext }: ReposPickStepProps) {
  const { repos, loading, favorites, toggle, addFolder } = useReposPick();

  if (loading) {
    return (
      <OnbShell
        stepIndex={stepIndex}
        title="Choose your repositories"
        subtitle="Finding projects with Claude Code set up — you can change this anytime."
      >
        <ReposWorkingView />
      </OnbShell>
    );
  }

  return (
    <OnbShell
      stepIndex={stepIndex}
      title="Choose your repositories"
      subtitle="Pick the ones to keep as favorites on your home screen — you can change this anytime."
      footer={
        <>
          <Button
            intent="outline"
            size="md"
            leftIcon={<FolderPlus size={15} aria-hidden="true" />}
            onClick={() => void addFolder()}
          >
            Add a folder
          </Button>
          <Button intent="primary" size="md" onClick={onNext}>
            Continue
          </Button>
        </>
      }
    >
      <div className="grid max-h-[220px] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
        {repos.length === 0 ? (
          <p className="text-sm text-fg-subtle">No repositories found.</p>
        ) : (
          repos.map((repo) => (
            <RepoCard
              key={repo.path}
              repo={repo}
              checked={favorites.has(repo.path)}
              onToggle={(path) => void toggle(path)}
            />
          ))
        )}
      </div>
    </OnbShell>
  );
}
