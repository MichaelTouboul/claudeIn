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
 * "Ajouter un dossier" picker. Favorites persist immediately via the
 * favoriteRepos IPC (see `useReposPick`); "Continuer" advances.
 */
export function ReposPickStep({ onNext }: ReposPickStepProps) {
  const { repos, loading, favorites, toggle, addFolder } = useReposPick();

  return (
    <OnbShell
      title="Vos dépôts favoris"
      subtitle="Choisissez les dépôts à épingler sur votre accueil."
    >
      {loading ? (
        <p className="text-sm text-fg-subtle">Recherche des dépôts…</p>
      ) : (
        <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
          {repos.length === 0 ? (
            <p className="text-sm text-fg-subtle">Aucun dépôt détecté.</p>
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
          Ajouter un dossier
        </Button>
        <Button intent="primary" size="md" onClick={onNext}>
          Continuer
        </Button>
      </div>
    </OnbShell>
  );
}
