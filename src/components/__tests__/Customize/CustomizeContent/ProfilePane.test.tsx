import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProfilePane } from "@/components/Customize/CustomizeContent/ProfilePane";
import type { UserProfile } from "@/lib/types";

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    claudeUserPath: "/home/u/.claude",
    name: "Ada",
    role: "Engineer",
    plugins: [],
    capabilities: { agents: { count: 2, names: ["a", "b"] }, skills: 1, mcp: 0, hooks: 3 },
    stack: ["TypeScript"],
    domains: ["backend"],
    onboardingCompletedAt: "x",
    generatedAt: null,
    updatedAt: null,
    ...overrides,
  };
}

const getUserProfile = vi.fn<() => Promise<UserProfile | null>>();
const locateClaudeUser = vi.fn<() => Promise<string | null>>();
const buildUserProfile = vi.fn<(p: string) => Promise<UserProfile>>();
const saveUserProfile = vi.fn<(p: UserProfile) => Promise<UserProfile>>();

beforeEach(() => {
  getUserProfile.mockReset().mockResolvedValue(makeProfile());
  locateClaudeUser.mockReset().mockResolvedValue("/home/u/.claude");
  buildUserProfile.mockReset().mockResolvedValue(makeProfile({ role: "Rebuilt" }));
  saveUserProfile.mockReset().mockImplementation((p) => Promise.resolve(p));
  window.api = {
    getUserProfile,
    locateClaudeUser,
    buildUserProfile,
    saveUserProfile,
  } as unknown as Window["api"];
});

async function clickRebuild() {
  const btn = await screen.findByRole("button", { name: /rebuild profile from my claude setup/i });
  await act(async () => {
    fireEvent.click(btn);
  });
  return btn;
}

describe("ProfilePane — Rebuild", () => {
  it("locates → builds → saves the built profile on click", async () => {
    render(<ProfilePane />);
    await clickRebuild();

    await waitFor(() => expect(locateClaudeUser).toHaveBeenCalledTimes(1));
    expect(buildUserProfile).toHaveBeenCalledWith("/home/u/.claude");
    await waitFor(() =>
      expect(saveUserProfile).toHaveBeenCalledWith(makeProfile({ role: "Rebuilt" })),
    );
  });

  it("shows a loading/disabled state while building", async () => {
    let resolveBuild: (p: UserProfile) => void = () => {};
    buildUserProfile.mockReturnValue(
      new Promise<UserProfile>((resolve) => {
        resolveBuild = resolve;
      }),
    );

    render(<ProfilePane />);
    const btn = await clickRebuild();

    await waitFor(() => expect(btn).toBeDisabled());
    expect(screen.getByText(/rebuilding/i)).toBeInTheDocument();

    await act(async () => {
      resolveBuild(makeProfile());
    });
    await waitFor(() => expect(btn).not.toBeDisabled());
  });

  it("shows an inline message when the Claude setup can't be located", async () => {
    locateClaudeUser.mockResolvedValue(null);

    render(<ProfilePane />);
    await clickRebuild();

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(buildUserProfile).not.toHaveBeenCalled();
    expect(saveUserProfile).not.toHaveBeenCalled();
  });
});
