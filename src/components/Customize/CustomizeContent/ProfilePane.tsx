import { UserProfileView } from "@/components/UserProfileView/UserProfileView";
import { useUserProfile } from "@/hooks/useUserProfile";

/**
 * Profile section of the Customize page: the shared, inline-editable
 * `UserProfileView` (same call shape as Home / onboarding) wired to the
 * singleton profile via `useUserProfile`. Shows a spinner while the profile
 * loads on first paint.
 */
export function ProfilePane() {
  const { profile, loading, save } = useUserProfile();

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
        <UserProfileView profile={profile} onSave={save} />
      </div>
    </section>
  );
}
