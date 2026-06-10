import { useCallback, useEffect, useState } from "react";

import { useOnboarding } from "@/hooks/useOnboarding";
import type { Candidate } from "@/types/onboarding.types";

import { IngestStep } from "./IngestStep";
import { ScanStep } from "./ScanStep";
import { WizardStep } from "./wizardStep";

type OnboardingWizardProps = {
  /** Called when the user finishes (enter app) or skips; the shell persists the flag. */
  onDone: () => void;
};

export function OnboardingWizard({ onDone }: OnboardingWizardProps) {
  const { scan, ingest, statusByScope, complete } = useOnboarding();
  const [step, setStep] = useState<WizardStep>(WizardStep.Scan);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [chosen, setChosen] = useState<Candidate[]>([]);

  useEffect(() => {
    let active = true;
    void scan().then((found) => {
      if (!active) return;
      setCandidates(found);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [scan]);

  const toggle = useCallback((path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const finish = useCallback(() => {
    complete();
    onDone();
  }, [complete, onDone]);

  const addSelected = useCallback(() => {
    const picked = candidates.filter((candidate) => selected.has(candidate.path));
    if (picked.length === 0) return;
    setChosen(picked);
    setStep(WizardStep.Ingest);
    // Kick off each scope independently — one rejection never blocks the rest.
    for (const candidate of picked) {
      void ingest(candidate);
    }
  }, [candidates, selected, ingest]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center surface-grain"
      style={{ background: "var(--color-surface-0)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Onboarding"
    >
      <div
        className="w-full max-w-xl rounded-lg p-6 shadow-2xl"
        style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-border)" }}
      >
        {step === WizardStep.Scan ? (
          <ScanStep
            candidates={candidates}
            loading={loading}
            selected={selected}
            onToggle={toggle}
            onAddSelected={addSelected}
            onSkip={finish}
          />
        ) : (
          <IngestStep scopes={chosen} statusByScope={statusByScope} onFinish={finish} />
        )}
      </div>
    </div>
  );
}
