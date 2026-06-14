import { useCallback, useState } from "react";

import { Dialog } from "@/components/_ui/Dialog";
import { DevReset } from "@/components/DevReset/DevReset";
import { UserProfileView } from "@/components/UserProfileView/UserProfileView";
import { useFavoriteRepos } from "@/hooks/useFavoriteRepos";
import { useProjects } from "@/hooks/useProjects";
import { useUserProfile } from "@/hooks/useUserProfile";
import type { FavoriteRepo } from "@/lib/types";
import { AppPage, useAppStore } from "@/store/useAppStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

import { FavoriteReposGrid } from "./FavoriteReposGrid/FavoriteReposGrid";
import { HomeActions } from "./HomeActions/HomeActions";
import { HomeGreeting } from "./HomeGreeting/HomeGreeting";
import { projectForFavorite } from "./openFavorite";

/**
 * Home page (layout A — stacked sections): greeting + profile link, a favorite-
 * repos grid (open → Dashboard, "+ ajouter" → folder picker), and an Actions row.
 * Real favorites/profile data via `useFavoriteRepos` / `useUserProfile`.
 */
export function HomePage() {
  const { repos, loading, add, remove } = useFavoriteRepos();
  const { profile, save } = useUserProfile();
  const { projects } = useProjects();
  const navigate = useAppStore((s) => s.navigate);
  const openDashboard = useWorkspaceStore((s) => s.openDashboard);
  const openLauncher = useWorkspaceStore((s) => s.openLauncher);
  const resolveLauncher = useWorkspaceStore((s) => s.resolveLauncher);
  const [profileOpen, setProfileOpen] = useState(false);

  const openFavorite = useCallback(
    (repo: FavoriteRepo) => {
      openDashboard(projectForFavorite(repo, projects));
      navigate(AppPage.Dashboard);
    },
    [openDashboard, projects, navigate],
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
      className="h-full overflow-y-auto surface-grain"
      style={{ background: "var(--color-surface-0)", color: "var(--color-text-primary)" }}
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
        <HomeGreeting name={profile?.name ?? null} onViewProfile={() => setProfileOpen(true)} />
        <FavoriteReposGrid
          repos={repos}
          loading={loading}
          onOpen={openFavorite}
          onRemove={(repo) => void remove(repo.path)}
          onAdd={() => void addFavorite()}
        />
        <HomeActions onOpenUserAgent={openUserAgent} onCustomize={() => navigate(AppPage.Customize)} />
        <div className="mt-2 flex justify-end">
          <DevReset />
        </div>
      </div>

      <Dialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        variant="drawer-right"
        title="Mon profil"
        contentClassName="w-[28rem] max-w-[90vw]"
      >
        <div className="h-full w-full overflow-y-auto border-l border-border bg-surface-1 p-6">
          <UserProfileView profile={profile} onSave={save} />
        </div>
      </Dialog>
    </div>
  );
}
