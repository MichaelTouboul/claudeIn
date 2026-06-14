import { type ReactElement, useCallback, useState } from "react";

import { ConsentReposStep } from "@/components/OnboardingPage/ConsentReposStep/ConsentReposStep";
import { ConsentUserStep } from "@/components/OnboardingPage/ConsentUserStep/ConsentUserStep";
import { DoneStep } from "@/components/OnboardingPage/DoneStep/DoneStep";
import { OnbStep } from "@/components/OnboardingPage/onbStep";
import { ProfileReviewStep } from "@/components/OnboardingPage/ProfileReviewStep/ProfileReviewStep";
import { ReposPickStep } from "@/components/OnboardingPage/ReposPickStep/ReposPickStep";
import { SearchUserStep } from "@/components/OnboardingPage/SearchUserStep/SearchUserStep";
import { WelcomeStep } from "@/components/OnboardingPage/WelcomeStep/WelcomeStep";
import type { UserProfile } from "@/lib/types";
import { AppPage, useAppStore } from "@/store/useAppStore";

/**
 * First-run onboarding as a linear state machine. `OnbStep` is the single source
 * of truth for the active screen; a step→render `Record` map drives the view
 * (no fallback chains — per CLAUDE.md). The flow is consent-gated with NO skip.
 *
 * Cross-step state (the active step + the built profile) is OnboardingPage-local
 * `useState`: it's used only within this subtree, passed one hop to each step,
 * and is meaningless once the flow unmounts — so per the state-management
 * decision tree it stays local rather than in a store or context.
 */
export function OnboardingPage() {
  const navigate = useAppStore((s) => s.navigate);
  const [step, setStep] = useState<OnbStep>(OnbStep.Welcome);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const onProfile = useCallback((built: UserProfile) => {
    setProfile(built);
    setStep(OnbStep.ProfileReview);
  }, []);

  const saveProfile = useCallback(async (next: UserProfile) => {
    const saved = await window.api.saveUserProfile(next);
    setProfile(saved);
    return saved;
  }, []);

  const finish = useCallback(async () => {
    await window.api.completeOnboarding();
    navigate(AppPage.Home);
  }, [navigate]);

  const view: Record<OnbStep, () => ReactElement> = {
    [OnbStep.Welcome]: () => <WelcomeStep onNext={() => setStep(OnbStep.ConsentUser)} />,
    [OnbStep.ConsentUser]: () => (
      <ConsentUserStep onAuthorize={() => setStep(OnbStep.SearchUser)} />
    ),
    [OnbStep.SearchUser]: () => <SearchUserStep onProfile={onProfile} />,
    [OnbStep.ProfileReview]: () => (
      <ProfileReviewStep
        profile={profile}
        onSave={saveProfile}
        onConfirm={() => setStep(OnbStep.ConsentRepos)}
      />
    ),
    [OnbStep.ConsentRepos]: () => (
      <ConsentReposStep onAuthorize={() => setStep(OnbStep.ReposPick)} />
    ),
    [OnbStep.ReposPick]: () => <ReposPickStep onNext={() => setStep(OnbStep.Done)} />,
    [OnbStep.Done]: () => <DoneStep onFinish={() => void finish()} />,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Onboarding"
      className="h-full overflow-y-auto surface-grain flex items-center justify-center p-8"
      style={{ background: "var(--color-surface-0)", color: "var(--color-text-primary)" }}
    >
      {view[step]()}
    </div>
  );
}
