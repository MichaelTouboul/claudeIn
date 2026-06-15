import { Button } from "@/components/_ui/Button";
import { Flex } from "@/components/_ui/Flex";

import { OnbShell } from "../OnbShell/OnbShell";
import { RepoCard } from "./RepoCard";
import { ReposWorkingView } from "./ReposWorkingView";
import { useReposPick } from "./useReposPick";

type ReposPickStepProps = {
  /** Advance to the final Done screen. */
  onNext: () => void;
};

/**
 * Step 6 — list scanned repos (with detected logos + LLM labels) as favorite
 * cards, plus an "Add a folder" picker. While the scan runs the body shows an
 * indeterminate progress bar with cycling status messages and the action buttons
 * are hidden, so the user can't continue mid-search. Favorites persist
 * immediately via the favoriteRepos IPC (see `useReposPick`); "Continue" advances.
 */
export function ReposPickStep({ onNext }: ReposPickStepProps) {
  const { repos, loading, favorites, toggle, addFolder } = useReposPick();

  if (loading) {
    return (
      <OnbShell
        title="Your favorite repositories"
        subtitle="Choose the repositories to pin on your home screen."
      >
        <ReposWorkingView />
      </OnbShell>
    );
  }

  return (
    <OnbShell
      title="Your favorite repositories"
      subtitle="Choose the repositories to pin on your home screen."
    >
      <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
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
      <Flex align="center" justify="between">
        <Button intent="outline" size="md" onClick={() => void addFolder()}>
          Add a folder
        </Button>
        <Button intent="primary" size="md" onClick={onNext}>
          Continue
        </Button>
      </Flex>
    </OnbShell>
  );
}
