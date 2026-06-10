import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IngestStatus } from "@/components/Onboarding/OnboardingWizard/ingestStatus";
import type { Candidate, ScopeProfile } from "@/types/onboarding.types";

import { ONBOARDED_FLAG_KEY, useOnboarding } from "./useOnboarding";

function makeCandidate(path: string, scope: Candidate["scope"] = "project"): Candidate {
  return { path, scope, hasClaude: true, plugins: [] };
}

function makeProfile(scopePath: string): ScopeProfile {
  return { scopePath, scope: "project", profileMd: "# md", generatedAt: "2026-06-10T00:00:00Z" };
}

describe("useOnboarding", () => {
  beforeEach(() => {
    localStorage.clear();
    window.api = {
      getOnboardingScan: vi.fn(async () => []),
      listProfiles: vi.fn(async () => []),
      ingestScope: vi.fn(async (scopePath: string) => makeProfile(scopePath)),
    } as unknown as Window["api"];
  });

  it("starts not onboarded when no profiles and no flag, then loads profiles", async () => {
    const { result } = renderHook(() => useOnboarding());
    await waitFor(() => expect(result.current.profilesLoaded).toBe(true));
    expect(result.current.isOnboarded).toBe(false);
  });

  it("is onboarded when profiles:list returns entries", async () => {
    (window.api.listProfiles as ReturnType<typeof vi.fn>).mockResolvedValue([makeProfile("/a")]);
    const { result } = renderHook(() => useOnboarding());
    await waitFor(() => expect(result.current.isOnboarded).toBe(true));
  });

  it("is onboarded when the persisted flag is set even with no profiles", async () => {
    localStorage.setItem(ONBOARDED_FLAG_KEY, "1");
    const { result } = renderHook(() => useOnboarding());
    await waitFor(() => expect(result.current.profilesLoaded).toBe(true));
    expect(result.current.isOnboarded).toBe(true);
  });

  it("scan() returns candidates from the IPC", async () => {
    (window.api.getOnboardingScan as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeCandidate("/repo"),
    ]);
    const { result } = renderHook(() => useOnboarding());
    let candidates: Candidate[] = [];
    await act(async () => {
      candidates = await result.current.scan();
    });
    expect(candidates).toEqual([makeCandidate("/repo")]);
  });

  it("ingest() advances a scope status pending -> running -> done", async () => {
    let resolveIngest: (p: ScopeProfile) => void = () => {};
    (window.api.ingestScope as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise<ScopeProfile>((res) => { resolveIngest = res; }),
    );
    const { result } = renderHook(() => useOnboarding());
    const candidate = makeCandidate("/repo");

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.ingest(candidate);
    });
    await waitFor(() =>
      expect(result.current.statusByScope["/repo"]).toBe(IngestStatus.Running),
    );

    await act(async () => {
      resolveIngest(makeProfile("/repo"));
      await pending;
    });
    expect(result.current.statusByScope["/repo"]).toBe(IngestStatus.Done);
  });

  it("a failing ingest marks that scope Error without throwing", async () => {
    (window.api.ingestScope as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useOnboarding());
    await act(async () => {
      await result.current.ingest(makeCandidate("/bad"));
    });
    expect(result.current.statusByScope["/bad"]).toBe(IngestStatus.Error);
  });

  it("complete() persists the onboarded flag and flips isOnboarded", async () => {
    const { result } = renderHook(() => useOnboarding());
    await waitFor(() => expect(result.current.profilesLoaded).toBe(true));
    act(() => {
      result.current.complete();
    });
    expect(localStorage.getItem(ONBOARDED_FLAG_KEY)).toBe("1");
    expect(result.current.isOnboarded).toBe(true);
  });
});
