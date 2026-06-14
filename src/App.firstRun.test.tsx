import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RepoCandidate, UserProfile } from "@/lib/types";
import { AppPage, useAppStore } from "@/store/useAppStore";

import App from "./App";

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    claudeUserPath: "/home/u/.claude",
    name: "Ada",
    role: "Engineer",
    plugins: ["babysitter"],
    capabilities: { agents: { count: 2, names: ["a", "b"] }, skills: 1, mcp: 0, hooks: 3 },
    summary: "A tidy setup.",
    domains: ["backend"],
    workflow: "TDD",
    onboardingCompletedAt: null,
    generatedAt: null,
    updatedAt: null,
    ...overrides,
  };
}

const getUserProfile = vi.fn<() => Promise<UserProfile | null>>();
const locateClaudeUser = vi.fn<() => Promise<string | null>>();
const buildUserProfile = vi.fn<(p: string) => Promise<UserProfile>>();
const saveUserProfile = vi.fn<(p: UserProfile) => Promise<UserProfile>>();
const completeOnboarding = vi.fn<() => Promise<UserProfile>>();
const resetUser = vi.fn<() => Promise<void>>();
const scanRepos = vi.fn<() => Promise<RepoCandidate[]>>();
const listFavoriteRepos = vi.fn<() => Promise<[]>>();
const addFavoriteRepo = vi.fn();
const removeFavoriteRepo = vi.fn<(p: string) => Promise<void>>();
const openDirectoryPicker = vi.fn<() => Promise<string | null>>();
const getProjects = vi.fn<() => Promise<[]>>();

beforeEach(() => {
  // Boot fresh: undecided page, no persisted onboarding yet.
  useAppStore.setState({ currentPage: null, selectedProject: null });
  // First-run: no profile at boot; completed profile once onboarding finishes.
  getUserProfile
    .mockReset()
    .mockResolvedValueOnce(null)
    .mockResolvedValue(makeProfile({ onboardingCompletedAt: "2026-06-11" }));
  locateClaudeUser.mockReset().mockResolvedValue("/home/u/.claude");
  buildUserProfile.mockReset().mockResolvedValue(makeProfile());
  saveUserProfile.mockReset().mockImplementation((p) => Promise.resolve(p));
  completeOnboarding
    .mockReset()
    .mockResolvedValue(makeProfile({ onboardingCompletedAt: "2026-06-11" }));
  resetUser.mockReset().mockResolvedValue(undefined);
  scanRepos.mockReset().mockResolvedValue([]);
  listFavoriteRepos.mockReset().mockResolvedValue([]);
  addFavoriteRepo.mockReset().mockResolvedValue(undefined);
  removeFavoriteRepo.mockReset().mockResolvedValue(undefined);
  openDirectoryPicker.mockReset();
  getProjects.mockReset().mockResolvedValue([]);
  window.api = {
    getUserProfile,
    locateClaudeUser,
    buildUserProfile,
    saveUserProfile,
    completeOnboarding,
    resetUser,
    scanRepos,
    listFavoriteRepos,
    addFavoriteRepo,
    removeFavoriteRepo,
    openDirectoryPicker,
    getProjects,
    onImproveContextMenuSelected: () => () => {},
    watchImproveInbox: () => Promise.resolve(),
    unwatchImproveInbox: () => Promise.resolve(),
    listImproveRequests: () => Promise.resolve([]),
    onImproveRequestChanged: () => () => {},
  } as unknown as Window["api"];
});

async function clickButton(name: RegExp) {
  const btn = await screen.findByRole("button", { name });
  await act(async () => {
    fireEvent.click(btn);
  });
}

describe("first-run path", () => {
  it("drives Welcome → Done → home, then dev-reset returns to onboarding", async () => {
    render(<App />);

    // Boot decides onboarding (no completed profile).
    await waitFor(() => expect(useAppStore.getState().currentPage).toBe(AppPage.Onboarding));
    expect(screen.getByRole("dialog", { name: /onboarding/i })).toBeInTheDocument();

    // Full consent-gated flow with no skip.
    await clickButton(/get started/i);
    await clickButton(/authorize/i); // consent user
    await screen.findByText(/A tidy setup\./);
    await clickButton(/confirm/i);
    await clickButton(/authorize/i); // consent repos
    await clickButton(/continue/i);
    await clickButton(/finish/i);

    // Done → completeOnboarding → home.
    await waitFor(() => expect(completeOnboarding).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(useAppStore.getState().currentPage).toBe(AppPage.Home));
    expect(await screen.findByText(/Ada/)).toBeInTheDocument();

    // Dev reset (DEV build) clears the user and re-enters onboarding.
    await clickButton(/reset onboarding \(dev\)/i);
    await waitFor(() => expect(resetUser).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(useAppStore.getState().currentPage).toBe(AppPage.Onboarding));
    expect(await screen.findByRole("button", { name: /get started/i })).toBeInTheDocument();
  });
});
