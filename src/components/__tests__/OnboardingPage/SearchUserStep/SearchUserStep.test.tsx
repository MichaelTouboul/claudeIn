import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SearchUserStep } from "@/components/OnboardingPage/SearchUserStep/SearchUserStep";
import type { UserProfile } from "@/lib/types";

function makeProfile(): UserProfile {
  return {
    claudeUserPath: "/picked/.claude",
    name: "Ada",
    role: null,
    plugins: [],
    capabilities: { agents: { count: 0, names: [] }, skills: 0, mcp: 0, hooks: 0 },
    summary: null,
    domains: [],
    workflow: null,
    onboardingCompletedAt: null,
    generatedAt: null,
    updatedAt: null,
  };
}

const locateClaudeUser = vi.fn<() => Promise<string | null>>();
const buildUserProfile = vi.fn<(p: string) => Promise<UserProfile>>();
const openDirectoryPicker = vi.fn<() => Promise<string | null>>();

beforeEach(() => {
  locateClaudeUser.mockReset();
  buildUserProfile.mockReset().mockResolvedValue(makeProfile());
  openDirectoryPicker.mockReset();
  window.api = {
    locateClaudeUser,
    buildUserProfile,
    openDirectoryPicker,
  } as unknown as Window["api"];
});

describe("SearchUserStep", () => {
  it("locates then builds the profile and hands it back", async () => {
    locateClaudeUser.mockResolvedValue("/home/u/.claude");
    const onProfile = vi.fn();
    render(<SearchUserStep onProfile={onProfile} />);
    await waitFor(() => expect(onProfile).toHaveBeenCalledTimes(1));
    expect(buildUserProfile).toHaveBeenCalledWith("/home/u/.claude");
  });

  it("on a null locate, prompts the folder picker then builds from the chosen path", async () => {
    locateClaudeUser.mockResolvedValue(null);
    openDirectoryPicker.mockResolvedValue("/picked/.claude");
    const onProfile = vi.fn();
    render(<SearchUserStep onProfile={onProfile} />);

    const pick = await screen.findByRole("button", { name: /choisir le dossier/i });
    await act(async () => {
      fireEvent.click(pick);
    });

    await waitFor(() => expect(buildUserProfile).toHaveBeenCalledWith("/picked/.claude"));
    expect(onProfile).toHaveBeenCalledTimes(1);
  });

  it("does not build when the picker is cancelled on a null locate", async () => {
    locateClaudeUser.mockResolvedValue(null);
    openDirectoryPicker.mockResolvedValue(null);
    const onProfile = vi.fn();
    render(<SearchUserStep onProfile={onProfile} />);

    const pick = await screen.findByRole("button", { name: /choisir le dossier/i });
    await act(async () => {
      fireEvent.click(pick);
    });

    expect(buildUserProfile).not.toHaveBeenCalled();
    expect(onProfile).not.toHaveBeenCalled();
  });

  it("offers a retry after a failure", async () => {
    locateClaudeUser.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce("/home/u/.claude");
    const onProfile = vi.fn();
    render(<SearchUserStep onProfile={onProfile} />);

    const retry = await screen.findByRole("button", { name: /réessayer/i });
    await act(async () => {
      fireEvent.click(retry);
    });

    await waitFor(() => expect(onProfile).toHaveBeenCalledTimes(1));
  });
});
