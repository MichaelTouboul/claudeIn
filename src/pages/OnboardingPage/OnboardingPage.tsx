import { type ReactElement, useCallback, useState } from "react";

import { ConsentReposStep } from "@/components/Onboarding/ConsentReposStep/ConsentReposStep";
import { ConsentUserStep } from "@/components/Onboarding/ConsentUserStep/ConsentUserStep";
import { DoneStep } from "@/components/Onboarding/DoneStep/DoneStep";
import { OnbStep, stepIndexOf } from "@/components/Onboarding/onbStep";
import { ProfileReviewStep } from "@/components/Onboarding/ProfileReviewStep/ProfileReviewStep";
import { ReposPickStep } from "@/components/Onboarding/ReposPickStep/ReposPickStep";
import { SearchUserStep } from "@/components/Onboarding/SearchUserStep/SearchUserStep";
import { WelcomeStep } from "@/components/Onboarding/WelcomeStep/WelcomeStep";
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

  const onProfile = useCallback(async (built: UserProfile) => {
    // Persist the moment the profile is built — not only if the user later edits
    // it in ProfileReview. `completeOnboarding` merges onto this row, so the
    // built name/role/domains/capabilities survive the rest of the flow.
    const saved = await window.api.saveUserProfile(built);
    setProfile(saved);
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
    [OnbStep.Welcome]: () => (
      <WelcomeStep stepIndex={stepIndexOf(OnbStep.Welcome)} onNext={() => setStep(OnbStep.ConsentUser)} />
    ),
    [OnbStep.ConsentUser]: () => (
      <ConsentUserStep
        stepIndex={stepIndexOf(OnbStep.ConsentUser)}
        onBack={() => setStep(OnbStep.Welcome)}
        onAuthorize={() => setStep(OnbStep.SearchUser)}
      />
    ),
    [OnbStep.SearchUser]: () => (
      <SearchUserStep stepIndex={stepIndexOf(OnbStep.SearchUser)} onProfile={onProfile} />
    ),
    [OnbStep.ProfileReview]: () => (
      <ProfileReviewStep
        stepIndex={stepIndexOf(OnbStep.ProfileReview)}
        profile={profile}
        onSave={saveProfile}
        onConfirm={() => setStep(OnbStep.ConsentRepos)}
        onBack={() => setStep(OnbStep.SearchUser)}
      />
    ),
    [OnbStep.ConsentRepos]: () => (
      <ConsentReposStep
        stepIndex={stepIndexOf(OnbStep.ConsentRepos)}
        onBack={() => setStep(OnbStep.ProfileReview)}
        onAuthorize={() => setStep(OnbStep.ReposPick)}
      />
    ),
    [OnbStep.ReposPick]: () => (
      <ReposPickStep stepIndex={stepIndexOf(OnbStep.ReposPick)} onNext={() => setStep(OnbStep.Done)} />
    ),
    [OnbStep.Done]: () => (
      <DoneStep stepIndex={stepIndexOf(OnbStep.Done)} onFinish={() => void finish()} />
    ),
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Onboarding"
      className="h-full overflow-y-auto p-8"
      style={{ background: "var(--color-surface-0)", color: "var(--color-text-primary)" }}
    >
      <div className="min-h-full flex items-center justify-center">{view[step]()}</div>
    </div>
  );
}
