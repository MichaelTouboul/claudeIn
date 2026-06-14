import { Button } from "@/components/_ui/Button";

import { OnbShell } from "../OnbShell/OnbShell";
import { RepoRow } from "./RepoRow";
import { useReposPick } from "./useReposPick";

type ReposPickStepProps = {
  /** Advance to the final Done screen. */
  onNext: () => void;
};

/**
 * Step 6 — list scanned repos (with LLM labels) as favorite checkboxes, plus an
 * "Add a folder" picker. Favorites persist immediately via the
 * favoriteRepos IPC (see `useReposPick`); "Continue" advances.
 */
export function ReposPickStep({ onNext }: ReposPickStepProps) {
  const { repos, loading, favorites, toggle, addFolder } = useReposPick();

  return (
    <OnbShell
      title="Your favorite repositories"
      subtitle="Choose the repositories to pin on your home screen."
    >
      {loading ? (
        <p className="text-sm text-fg-subtle">Searching for repositories…</p>
      ) : (
        <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
          {repos.length === 0 ? (
            <p className="text-sm text-fg-subtle">No repositories found.</p>
          ) : (
            repos.map((repo) => (
              <RepoRow
                key={repo.path}
                repo={repo}
                checked={favorites.has(repo.path)}
                onToggle={(path) => void toggle(path)}
              />
            ))
          )}
        </div>
      )}
      <div className="flex items-center justify-between">
        <Button intent="outline" size="md" onClick={() => void addFolder()}>
          Add a folder
        </Button>
        <Button intent="primary" size="md" onClick={onNext}>
          Continue
        </Button>
      </div>
    </OnbShell>
  );
}
