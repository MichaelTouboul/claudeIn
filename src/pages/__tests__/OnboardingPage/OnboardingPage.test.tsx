import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RepoCandidate, UserProfile } from "@/lib/types";
import { OnboardingPage } from "@/pages/OnboardingPage/OnboardingPage";
import { AppPage, useAppStore } from "@/store/useAppStore";

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    claudeUserPath: "/home/u/.claude",
    name: "Ada",
    role: "Engineer",
    plugins: ["babysitter"],
    capabilities: { agents: { count: 2, names: ["a", "b"] }, skills: 1, mcp: 0, hooks: 3 },
    domains: ["backend"],
    onboardingCompletedAt: null,
    generatedAt: null,
    updatedAt: null,
    ...overrides,
  };
}

const locateClaudeUser = vi.fn<() => Promise<string | null>>();
const buildUserProfile = vi.fn<(p: string) => Promise<UserProfile>>();
const saveUserProfile = vi.fn<(p: UserProfile) => Promise<UserProfile>>();
const completeOnboarding = vi.fn<() => Promise<UserProfile>>();
const scanRepos = vi.fn<() => Promise<RepoCandidate[]>>();
const listFavoriteRepos = vi.fn<() => Promise<[]>>();
const addFavoriteRepo = vi.fn();
const removeFavoriteRepo = vi.fn<(p: string) => Promise<void>>();
const openDirectoryPicker = vi.fn<() => Promise<string | null>>();

beforeEach(() => {
  useAppStore.setState({ currentPage: AppPage.Onboarding, selectedProject: null });
  locateClaudeUser.mockReset().mockResolvedValue("/home/u/.claude");
  buildUserProfile.mockReset().mockResolvedValue(makeProfile());
  saveUserProfile.mockReset().mockImplementation((p) => Promise.resolve(p));
  completeOnboarding.mockReset().mockResolvedValue(makeProfile({ onboardingCompletedAt: "x" }));
  scanRepos.mockReset().mockResolvedValue([]);
  listFavoriteRepos.mockReset().mockResolvedValue([]);
  addFavoriteRepo.mockReset().mockResolvedValue(undefined);
  removeFavoriteRepo.mockReset().mockResolvedValue(undefined);
  openDirectoryPicker.mockReset();
  window.api = {
    locateClaudeUser,
    buildUserProfile,
    saveUserProfile,
    completeOnboarding,
    scanRepos,
    listFavoriteRepos,
    addFavoriteRepo,
    removeFavoriteRepo,
    openDirectoryPicker,
  } as unknown as Window["api"];
});

async function click(name: RegExp) {
  const btn = await screen.findByRole("button", { name });
  await act(async () => {
    fireEvent.click(btn);
  });
}

describe("OnboardingPage", () => {
  it("renders the welcome step first inside a dialog", async () => {
    render(<OnboardingPage />);
    expect(screen.getByRole("dialog", { name: /onboarding/i })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /get started/i })).toBeInTheDocument();
  });

  it("offers no skip option on either consent step", async () => {
    render(<OnboardingPage />);
    await click(/get started/i);
    expect(screen.getByRole("button", { name: /authorize/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /passer|ignorer|skip/i })).toBeNull();
  });

  it("advances welcome → consent → search → profile review", async () => {
    render(<OnboardingPage />);
    await click(/get started/i);
    await click(/authorize/i);
    expect(await screen.findByText("backend")).toBeInTheDocument();
    expect(buildUserProfile).toHaveBeenCalledWith("/home/u/.claude");
  });

  it("runs the full flow to Done, which completes onboarding and navigates home", async () => {
    render(<OnboardingPage />);
    await click(/get started/i);
    await click(/authorize/i);
    await screen.findByText("backend");
    await click(/confirm/i);
    await click(/authorize/i);
    await click(/continue/i);
    await click(/finish/i);

    await waitFor(() => expect(completeOnboarding).toHaveBeenCalledTimes(1));
    expect(useAppStore.getState().currentPage).toBe(AppPage.Home);
  });
});
