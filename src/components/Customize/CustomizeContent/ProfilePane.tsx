import { RefreshCw } from "lucide-react";

import { Button } from "@/components/_ui/Button";
import { UserProfileView } from "@/components/UserProfileView/UserProfileView";
import { useUserProfile } from "@/hooks/useUserProfile";

import { useRebuildProfile } from "./useRebuildProfile";

/**
 * Profile section of the Customize page: the shared, inline-editable
 * `UserProfileView` (same call shape as Home / onboarding) wired to the
 * singleton profile via `useUserProfile`. Shows a spinner while the profile
 * loads on first paint. A "Rebuild from my setup" action re-derives the profile
 * from the local Claude setup so a stale/empty profile can be repopulated
 * without re-running onboarding.
 */
export function ProfilePane() {
  const { profile, loading, save } = useUserProfile();
  const { building, error, rebuild } = useRebuildProfile(save);

  if (loading) {
    return (
      <div className="flex-1 h-full flex items-center justify-center" aria-label="Loading profile">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <section aria-label="Profile" className="flex-1 min-h-0 overflow-y-auto p-6">
      <div className="max-w-2xl">
        <div className="flex items-center justify-end gap-2 mb-3">
          <Button
            type="button"
            intent="outline"
            size="sm"
            onClick={() => void rebuild()}
            disabled={building}
            aria-label="Rebuild profile from my Claude setup"
          >
            <RefreshCw size={12} className={building ? "animate-spin" : undefined} />
            {building ? "Rebuilding…" : "Rebuild from my setup"}
          </Button>
        </div>
        {error !== null ? (
          <p role="alert" className="mb-3 text-xs" style={{ color: "var(--color-danger)" }}>
            {error}
          </p>
        ) : null}
        <UserProfileView profile={profile} onSave={save} />
      </div>
    </section>
  );
}
