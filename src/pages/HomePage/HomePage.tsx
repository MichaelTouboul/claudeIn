import { useCallback, useMemo, useRef, useState } from "react";

import { Dialog } from "@/components/_ui/Dialog";
import { DevReset } from "@/components/DevReset/DevReset";
import { FavoriteReposGrid } from "@/components/Home/FavoriteReposGrid/FavoriteReposGrid";
import { HomeActions } from "@/components/Home/HomeActions/HomeActions";
import { HomeGreeting } from "@/components/Home/HomeGreeting/HomeGreeting";
import { HomeToast } from "@/components/Home/HomeToast/HomeToast";
import { HomeTopbar } from "@/components/Home/HomeTopbar/HomeTopbar";
import { UserProfileView } from "@/components/UserProfileView/UserProfileView";
import { useFavoriteRepos } from "@/hooks/useFavoriteRepos";
import { useProjects } from "@/hooks/useProjects";
import { useUserProfile } from "@/hooks/useUserProfile";
import type { FavoriteRepo } from "@/lib/types";
import { projectForFavorite, repoLabel } from "@/lib/utils";
import { AppPage, useAppStore } from "@/store/useAppStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

/**
 * Home page (design-system layout): a topbar (brand · project search · "New
 * session" · profile), a "Hello, {name}" greeting, a filterable favorite-repos
 * grid (open → Dashboard, "+ add" → folder picker), an Actions row, and the
 * profile in a right-side drawer. Real favorites/profile data via the hooks.
 */
export function HomePage() {
  const { repos, loading, pending, add, remove } = useFavoriteRepos();
  const { profile, save } = useUserProfile();
  const { projects } = useProjects();
  const navigate = useAppStore((s) => s.navigate);
  const openDashboard = useWorkspaceStore((s) => s.openDashboard);
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const resolveLauncher = useWorkspaceStore((s) => s.resolveLauncher);

  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current !== null) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === "") return repos;
    return repos.filter(
      (r) => repoLabel(r).toLowerCase().includes(q) || r.path.toLowerCase().includes(q),
    );
  }, [repos, query]);

  const filteredEmpty = query.trim() !== "" && filtered.length === 0 && repos.length > 0;

  const openFavorite = useCallback(
    (repo: FavoriteRepo) => {
      showToast(`Opening ${repoLabel(repo)}…`);
      openDashboard(projectForFavorite(repo, projects));
      navigate(AppPage.Dashboard);
    },
    [showToast, openDashboard, projects, navigate],
  );

  const addFavorite = useCallback(async () => {
    const dir = await window.api.openDirectoryPicker();
    if (dir === null) return;
    await add(dir);
  }, [add]);

  const openUserAgent = useCallback(() => {
    const id = openLauncher();
    resolveLauncher(id, { to: "discussion" });
    navigate(AppPage.Dashboard);
  }, [openLauncher, resolveLauncher, navigate]);

  return (
    <div
      className="flex h-full flex-col surface-grain"
      style={{ background: "var(--color-surface-0)", color: "var(--color-text-primary)" }}
    >
      <HomeTopbar
        query={query}
        onQueryChange={setQuery}
        profileName={profile?.name ?? null}
        onNewSession={openUserAgent}
        onOpenProfile={() => setProfileOpen(true)}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[var(--content-max)] flex-col gap-9 px-8 pb-16 pt-10">
          <HomeGreeting name={profile?.name ?? null} />
          <FavoriteReposGrid
            repos={filtered}
            total={repos.length}
            loading={loading}
            pending={pending}
            filteredEmpty={filteredEmpty}
            onOpen={openFavorite}
            onRemove={(repo) => void remove(repo.path)}
            onAdd={() => void addFavorite()}
          />
          <HomeActions onOpenUserAgent={openUserAgent} onCustomize={() => navigate(AppPage.Customize)} />
          <div className="mt-2 flex justify-end">
            <DevReset />
          </div>
        </div>
      </div>

      <Dialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        variant="drawer-right"
        title="My profile"
        contentClassName="w-[26rem] max-w-[90vw]"
      >
        <div className="h-full w-full overflow-y-auto border-l border-border bg-surface-1 p-6">
          <UserProfileView profile={profile} onSave={save} />
        </div>
      </Dialog>

      <HomeToast message={toast} />
    </div>
  );
}
