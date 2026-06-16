import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UserProfile } from "@/lib/types";
import { AppPage, useAppStore } from "@/store/useAppStore";

import { useBootPage } from "../useBootPage";

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    claudeUserPath: "/home/u/.claude",
    name: null,
    role: null,
    plugins: [],
    capabilities: { agents: { count: 0, names: [] }, skills: 0, mcp: 0, hooks: 0 },
    stack: [],
    domains: [],
    onboardingCompletedAt: null,
    generatedAt: null,
    updatedAt: null,
    ...overrides,
  };
}

const getUserProfile = vi.fn<() => Promise<UserProfile | null>>();

beforeEach(() => {
  useAppStore.setState({ currentPage: null, selectedProject: null });
  getUserProfile.mockReset();
  window.api = { getUserProfile } as unknown as Window["api"];
});

describe("useBootPage", () => {
  it("returns null while the profile is still loading (no flash)", () => {
    getUserProfile.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useBootPage());
    expect(result.current).toBeNull();
  });

  it("boots to home when onboarding is completed", async () => {
    getUserProfile.mockResolvedValue(makeProfile({ onboardingCompletedAt: "2026-06-11T10:00:00Z" }));
    const { result } = renderHook(() => useBootPage());
    await waitFor(() => expect(result.current).toBe(AppPage.Home));
  });

  it("boots to onboarding when onboarding is not completed", async () => {
    getUserProfile.mockResolvedValue(makeProfile({ onboardingCompletedAt: null }));
    const { result } = renderHook(() => useBootPage());
    await waitFor(() => expect(result.current).toBe(AppPage.Onboarding));
  });

  it("boots to onboarding when there is no profile (first run)", async () => {
    getUserProfile.mockResolvedValue(null);
    const { result } = renderHook(() => useBootPage());
    await waitFor(() => expect(result.current).toBe(AppPage.Onboarding));
  });

  it("calls getUserProfile only once even across re-renders", async () => {
    getUserProfile.mockResolvedValue(makeProfile({ onboardingCompletedAt: "x" }));
    const { rerender } = renderHook(() => useBootPage());
    await waitFor(() => expect(getUserProfile).toHaveBeenCalledTimes(1));
    rerender();
    rerender();
    expect(getUserProfile).toHaveBeenCalledTimes(1);
  });
});
