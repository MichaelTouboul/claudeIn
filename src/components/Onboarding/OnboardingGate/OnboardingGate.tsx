import { useState } from "react";

import { useOnboarding } from "@/hooks/useOnboarding";

import { OnboardingWizard } from "../OnboardingWizard/OnboardingWizard";

/**
 * First-run gate: mounts the OnboardingWizard until the user is onboarded
 * (profiles exist or the persisted flag is set) or dismisses the wizard.
 */
export function OnboardingGate() {
  const { profilesLoaded, isOnboarded } = useOnboarding();
  const [dismissed, setDismissed] = useState(false);

  // Wait for the gate decision to settle so the wizard never flashes when the
  // user is already onboarded.
  if (!profilesLoaded || isOnboarded || dismissed) {
    return null;
  }

  return <OnboardingWizard onDone={() => setDismissed(true)} />;
}
