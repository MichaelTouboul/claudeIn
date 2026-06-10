import { useCallback, useEffect, useState } from "react";

import { IngestStatus } from "@/components/Onboarding/OnboardingWizard/ingestStatus";
import type { Candidate } from "@/types/onboarding.types";

/** localStorage key for the "first-run onboarding finished" flag (shows the wizard once). */
export const ONBOARDED_FLAG_KEY = "claudein:onboardingCompleted";

function readOnboardedFlag(): boolean {
  return localStorage.getItem(ONBOARDED_FLAG_KEY) === "1";
}

export type UseOnboarding = {
  /** True once profiles:list has resolved (so the gate decision is settled). */
  profilesLoaded: boolean;
  /** Gate: onboarded if profiles already exist OR the persisted flag is set. */
  isOnboarded: boolean;
  /** Per-scope ingestion status, keyed by candidate path. */
  statusByScope: Record<string, IngestStatus>;
  /** Run discovery; returns the candidate list. */
  scan: () => Promise<Candidate[]>;
  /** Ingest one scope, advancing its status; never throws (errors → Error state). */
  ingest: (candidate: Candidate) => Promise<void>;
  /** Mark onboarding finished: persist the flag so the wizard shows once. */
  complete: () => void;
};

export function useOnboarding(): UseOnboarding {
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const [hasProfiles, setHasProfiles] = useState(false);
  const [flagged, setFlagged] = useState<boolean>(readOnboardedFlag);
  const [statusByScope, setStatusByScope] = useState<Record<string, IngestStatus>>({});

  useEffect(() => {
    let active = true;
    void window.api.listProfiles().then((profiles) => {
      if (!active) return;
      setHasProfiles(profiles.length > 0);
      setProfilesLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const scan = useCallback(() => window.api.getOnboardingScan(), []);

  const ingest = useCallback(async (candidate: Candidate) => {
    setStatusByScope((prev) => ({ ...prev, [candidate.path]: IngestStatus.Running }));
    try {
      await window.api.ingestScope(candidate.path, candidate.scope, candidate.plugins);
      setStatusByScope((prev) => ({ ...prev, [candidate.path]: IngestStatus.Done }));
    } catch {
      setStatusByScope((prev) => ({ ...prev, [candidate.path]: IngestStatus.Error }));
    }
  }, []);

  const complete = useCallback(() => {
    localStorage.setItem(ONBOARDED_FLAG_KEY, "1");
    setFlagged(true);
  }, []);

  const isOnboarded = hasProfiles || flagged;

  return { profilesLoaded, isOnboarded, statusByScope, scan, ingest, complete };
}
