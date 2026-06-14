import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UserProfile } from "@/lib/types";

import { useUserProfile } from "../useUserProfile";

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    claudeUserPath: "/home/u/.claude",
    name: "Ada",
    role: null,
    plugins: [],
    capabilities: { agents: { count: 0, names: [] }, skills: 0, mcp: 0, hooks: 0 },
    summary: null,
    domains: [],
    workflow: null,
    onboardingCompletedAt: "x",
    generatedAt: null,
    updatedAt: null,
    ...overrides,
  };
}

const getUserProfile = vi.fn<() => Promise<UserProfile | null>>();
const saveUserProfile = vi.fn<(p: UserProfile) => Promise<UserProfile>>();

beforeEach(() => {
  getUserProfile.mockReset();
  saveUserProfile.mockReset();
  window.api = { getUserProfile, saveUserProfile } as unknown as Window["api"];
});

describe("useUserProfile", () => {
  it("loads the profile on mount", async () => {
    getUserProfile.mockResolvedValue(makeProfile({ name: "Ada" }));
    const { result } = renderHook(() => useUserProfile());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile?.name).toBe("Ada");
  });

  it("exposes a null profile on first run", async () => {
    getUserProfile.mockResolvedValue(null);
    const { result } = renderHook(() => useUserProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toBeNull();
  });

  it("save() persists and updates the local profile", async () => {
    getUserProfile.mockResolvedValue(makeProfile({ name: "Ada" }));
    saveUserProfile.mockImplementation((p) => Promise.resolve(p));
    const { result } = renderHook(() => useUserProfile());
    await waitFor(() => expect(result.current.profile?.name).toBe("Ada"));

    const next = makeProfile({ name: "Grace" });
    await act(async () => {
      await result.current.save(next);
    });

    expect(saveUserProfile).toHaveBeenCalledWith(next);
    expect(result.current.profile?.name).toBe("Grace");
  });
});
