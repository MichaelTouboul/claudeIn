import { ChevronRight, FolderPlus } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/_ui/Button";
import { Stack } from "@/components/_ui/Stack";
import { repoBasename } from "@/lib/utils";

import { OnbShell } from "../OnbShell/OnbShell";
import { RepoCard } from "./RepoCard";
import { ReposToolbar } from "./ReposToolbar";
import { ReposWorkingView } from "./ReposWorkingView";
import { useReposPick } from "./useReposPick";

type ReposPickStepProps = {
  /** Position in the flow (drives the progress header). */
  stepIndex: number;
  /** Advance to the final Done screen. */
  onNext: () => void;
};

/**
 * Step 6 — list scanned repos (with detected logos + LLM labels) as selectable
 * favorite tiles, fronted by a toolbar (search, a "{count} selected" badge, and a
 * Select all/Clear all toggle) plus an "Add a folder" picker. While the scan runs
 * the body shows an indeterminate progress bar and the footer actions are hidden.
 * Favorites persist immediately via the favoriteRepos IPC (see `useReposPick`);
 * "Continue" advances and is disabled until at least one repo is picked.
 */
export function ReposPickStep({ stepIndex, onNext }: ReposPickStepProps) {
  const { repos, loading, favorites, toggle, pinAll, clearAll, addFolder } = useReposPick();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === "") return repos;
    return repos.filter(
      (r) =>
        repoBasename(r.path).toLowerCase().includes(q) ||
        (r.label ?? "").toLowerCase().includes(q),
    );
  }, [repos, query]);

  if (loading) {
    return (
      <OnbShell
        wide
        stepIndex={stepIndex}
        title="Choose your repositories"
        subtitle="Finding projects with Claude Code set up — you can change this anytime."
      >
        <ReposWorkingView />
      </OnbShell>
    );
  }

  const visiblePaths = filtered.map((r) => r.path);
  const allSelected = visiblePaths.length > 0 && visiblePaths.every((p) => favorites.has(p));
  const onToggleAll = () => void (allSelected ? clearAll(visiblePaths) : pinAll(visiblePaths));

  return (
    <OnbShell
      wide
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
          <Button
            intent="primary"
            size="md"
            disabled={favorites.size === 0}
            rightIcon={<ChevronRight size={15} aria-hidden="true" />}
            onClick={onNext}
          >
            Continue with {favorites.size}
          </Button>
        </>
      }
    >
      <Stack gap={4}>
        <ReposToolbar
          query={query}
          onQueryChange={setQuery}
          selectedCount={favorites.size}
          allSelected={allSelected}
          onToggleAll={onToggleAll}
        />
        <div className="grid max-h-[420px] grid-cols-1 gap-2.5 overflow-y-auto sm:grid-cols-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-fg-subtle">No repositories found.</p>
          ) : (
            filtered.map((repo) => (
              <RepoCard
                key={repo.path}
                repo={repo}
                checked={favorites.has(repo.path)}
                onToggle={(path) => void toggle(path)}
              />
            ))
          )}
        </div>
      </Stack>
    </OnbShell>
  );
}
