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
    <section aria-label="Profile" className="flex-1 min-h-0 overflow-y-auto px-8 py-7">
      <div className="max-w-2xl flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h1
              className="text-[22px] font-semibold tracking-[-0.01em]"
              style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-sans)" }}
            >
              Profile
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              Your identity and defaults across ClaudeIn.
            </p>
          </div>
          <Button
            type="button"
            intent="secondary"
            size="sm"
            onClick={() => void rebuild()}
            disabled={building}
            aria-label="Rebuild profile from my Claude setup"
            leftIcon={<RefreshCw size={13} className={building ? "animate-spin" : undefined} aria-hidden="true" />}
          >
            {building ? "Rebuilding…" : "Rebuild from my setup"}
          </Button>
        </div>
        {error !== null ? (
          <p role="alert" className="text-xs" style={{ color: "var(--color-danger)" }}>
            {error}
          </p>
        ) : null}
        <UserProfileView profile={profile} onSave={save} />
      </div>
    </section>
  );
}
