import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UserProfile } from "@/lib/types";
import { AppPage, useAppStore } from "@/store/useAppStore";
import { useImproveStore } from "@/store/useImproveStore";

import App from "./App";

// Mock the three pages so the router decision is observed in isolation, without
// pulling in the heavy Dashboard subtree.
vi.mock("@/components/OnboardingPage/OnboardingPage", () => ({
  OnboardingPage: () => <div data-testid="onboarding-page" />,
}));
vi.mock("@/components/HomePage/HomePage", () => ({
  HomePage: () => <div data-testid="home-page" />,
}));
vi.mock("@/components/DashboardPage/DashboardPage", () => ({
  DashboardPage: () => <div data-testid="dashboard-page" />,
}));
vi.mock("@/components/CustomizePage/CustomizePage", () => ({
  CustomizePage: () => <div data-testid="customize-page" />,
}));

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

const getUserProfile = vi.fn<() => Promise<UserProfile | null>>();
const watchImproveInbox = vi.fn<() => Promise<void>>();
const unwatchImproveInbox = vi.fn<() => Promise<void>>();
const listImproveRequests = vi.fn<() => Promise<[]>>();
const onImproveRequestChanged = vi.fn(() => () => {});

beforeEach(() => {
  useAppStore.setState({ currentPage: null, selectedProject: null });
  useImproveStore.setState({ requests: {}, acknowledgedIds: new Set() });
  getUserProfile.mockReset();
  watchImproveInbox.mockReset().mockResolvedValue(undefined);
  unwatchImproveInbox.mockReset().mockResolvedValue(undefined);
  listImproveRequests.mockReset().mockResolvedValue([]);
  onImproveRequestChanged.mockClear();
  window.api = {
    getUserProfile,
    onImproveContextMenuSelected: () => () => {},
    watchImproveInbox,
    unwatchImproveInbox,
    listImproveRequests,
    onImproveRequestChanged,
  } as unknown as Window["api"];
});

describe("App router boot decision", () => {
  it("renders the home page when onboarding is completed", async () => {
    getUserProfile.mockResolvedValue(makeProfile({ onboardingCompletedAt: "2026-06-11T10:00:00Z" }));
    render(<App />);
    expect(await screen.findByTestId("home-page")).toBeInTheDocument();
    expect(screen.queryByTestId("onboarding-page")).not.toBeInTheDocument();
  });

  it("renders the onboarding page when onboarding is not completed", async () => {
    getUserProfile.mockResolvedValue(makeProfile({ onboardingCompletedAt: null }));
    render(<App />);
    expect(await screen.findByTestId("onboarding-page")).toBeInTheDocument();
    expect(screen.queryByTestId("home-page")).not.toBeInTheDocument();
  });

  it("renders the onboarding page on first run (no profile)", async () => {
    getUserProfile.mockResolvedValue(null);
    render(<App />);
    expect(await screen.findByTestId("onboarding-page")).toBeInTheDocument();
  });

  it("shows no page (loader only) until the profile resolves", () => {
    getUserProfile.mockReturnValue(new Promise(() => {}));
    render(<App />);
    expect(screen.queryByTestId("onboarding-page")).not.toBeInTheDocument();
    expect(screen.queryByTestId("home-page")).not.toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-page")).not.toBeInTheDocument();
  });
});

describe("App router navigation", () => {
  it("swaps to the dashboard page after navigate('dashboard')", async () => {
    getUserProfile.mockResolvedValue(makeProfile({ onboardingCompletedAt: "x" }));
    render(<App />);
    await screen.findByTestId("home-page");

    act(() => {
      useAppStore.getState().navigate(AppPage.Dashboard);
    });
    await waitFor(() => expect(screen.getByTestId("dashboard-page")).toBeInTheDocument());
    expect(screen.queryByTestId("home-page")).not.toBeInTheDocument();
  });

  it("renders the customize page after navigate('customize')", async () => {
    getUserProfile.mockResolvedValue(makeProfile({ onboardingCompletedAt: "x" }));
    render(<App />);
    await screen.findByTestId("home-page");

    act(() => {
      useAppStore.getState().navigate(AppPage.Customize);
    });
    await waitFor(() => expect(screen.getByTestId("customize-page")).toBeInTheDocument());
    expect(screen.queryByTestId("home-page")).not.toBeInTheDocument();
  });

  it("returns to home after navigate('home')", async () => {
    getUserProfile.mockResolvedValue(makeProfile({ onboardingCompletedAt: "x" }));
    render(<App />);
    await screen.findByTestId("home-page");

    act(() => {
      useAppStore.getState().navigate(AppPage.Dashboard);
    });
    await waitFor(() => expect(screen.getByTestId("dashboard-page")).toBeInTheDocument());

    act(() => {
      useAppStore.getState().navigate(AppPage.Home);
    });
    await waitFor(() => expect(screen.getByTestId("home-page")).toBeInTheDocument());
  });
});

describe("App global Self-Improve notification", () => {
  const trigger = /updates|improvements? ready/i;

  it("initialises the improve watch/subscription from the App root", async () => {
    getUserProfile.mockResolvedValue(makeProfile({ onboardingCompletedAt: "x" }));
    render(<App />);
    await screen.findByTestId("home-page");

    expect(watchImproveInbox).toHaveBeenCalledTimes(1);
    expect(listImproveRequests).toHaveBeenCalledTimes(1);
    expect(onImproveRequestChanged).toHaveBeenCalledTimes(1);
  });

  it("renders the always-visible trigger on the Home page", async () => {
    getUserProfile.mockResolvedValue(makeProfile({ onboardingCompletedAt: "x" }));
    render(<App />);
    await screen.findByTestId("home-page");
    expect(screen.getByRole("button", { name: trigger })).toBeInTheDocument();
  });

  it("renders the trigger on the Dashboard page", async () => {
    getUserProfile.mockResolvedValue(makeProfile({ onboardingCompletedAt: "x" }));
    render(<App />);
    await screen.findByTestId("home-page");
    act(() => {
      useAppStore.getState().navigate(AppPage.Dashboard);
    });
    await screen.findByTestId("dashboard-page");
    expect(screen.getByRole("button", { name: trigger })).toBeInTheDocument();
  });

  it("renders the trigger on the Customize page", async () => {
    getUserProfile.mockResolvedValue(makeProfile({ onboardingCompletedAt: "x" }));
    render(<App />);
    await screen.findByTestId("home-page");
    act(() => {
      useAppStore.getState().navigate(AppPage.Customize);
    });
    await screen.findByTestId("customize-page");
    expect(screen.getByRole("button", { name: trigger })).toBeInTheDocument();
  });

  it("does NOT render the trigger on the Onboarding page", async () => {
    getUserProfile.mockResolvedValue(makeProfile({ onboardingCompletedAt: null }));
    render(<App />);
    await screen.findByTestId("onboarding-page");
    expect(screen.queryByRole("button", { name: trigger })).not.toBeInTheDocument();
  });
});
