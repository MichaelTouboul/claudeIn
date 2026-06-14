import { beforeEach, describe, expect, it } from "vitest";

import type { UserProfile } from "@/types/user.types";

import { AppPage, bootPageFor, useAppStore } from "../useAppStore";

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    claudeUserPath: "/home/u/.claude",
    name: null,
    role: null,
    plugins: [],
    capabilities: { agents: { count: 0, names: [] }, skills: 0, mcp: 0, hooks: 0 },
    summary: null,
    domains: [],
    workflow: null,
    onboardingCompletedAt: null,
    generatedAt: null,
    updatedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  useAppStore.setState({ currentPage: null, selectedProject: null });
});

describe("bootPageFor", () => {
  it("→ home when onboarding is completed", () => {
    expect(bootPageFor(makeProfile({ onboardingCompletedAt: "2026-06-11T10:00:00Z" }))).toBe(
      AppPage.Home,
    );
  });

  it("→ onboarding when the profile exists but onboarding is not completed", () => {
    expect(bootPageFor(makeProfile({ onboardingCompletedAt: null }))).toBe(AppPage.Onboarding);
  });

  it("→ onboarding when there is no profile at all (first run)", () => {
    expect(bootPageFor(null)).toBe(AppPage.Onboarding);
  });
});

describe("useAppStore navigation", () => {
  it("starts with no page decided (null) so the router can show a loader", () => {
    expect(useAppStore.getState().currentPage).toBeNull();
  });

  it("navigate sets the current page", () => {
    useAppStore.getState().navigate(AppPage.Home);
    expect(useAppStore.getState().currentPage).toBe(AppPage.Home);

    useAppStore.getState().navigate(AppPage.Dashboard);
    expect(useAppStore.getState().currentPage).toBe(AppPage.Dashboard);

    useAppStore.getState().navigate(AppPage.Onboarding);
    expect(useAppStore.getState().currentPage).toBe(AppPage.Onboarding);
  });
});
