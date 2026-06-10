import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ScopeProfile } from "@/types/onboarding.types";

import { ProfileView } from "./ProfileView";

function makeProfile(overrides: Partial<ScopeProfile> = {}): ScopeProfile {
  return {
    scopePath: "/home/me/repo-a",
    scope: "project",
    profileMd: "# Repo A\n\nNarrative profile body.",
    generatedAt: "2026-06-10T00:00:00Z",
    ...overrides,
  };
}

describe("ProfileView", () => {
  beforeEach(() => {
    window.api = {
      refreshProfile: vi.fn(async (scopePath: string) =>
        makeProfile({ scopePath, profileMd: "# Refreshed body" }),
      ),
    } as unknown as Window["api"];
  });

  it("renders the profile markdown via MarkdownBody", () => {
    render(<ProfileView scopePath="/home/me/repo-a" profile={makeProfile()} />);
    expect(screen.getByText(/Narrative profile body/)).toBeInTheDocument();
  });

  it("Refresh calls refreshProfile for the scope and shows the refreshed profile", async () => {
    render(<ProfileView scopePath="/home/me/repo-a" profile={makeProfile()} />);

    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));

    await waitFor(() => expect(screen.getByText(/Refreshed body/)).toBeInTheDocument());
    expect(window.api.refreshProfile).toHaveBeenCalledWith("/home/me/repo-a");
    expect(screen.queryByText(/Narrative profile body/)).not.toBeInTheDocument();
  });

  it("shows a 'not generated yet' empty state when there is no profile", () => {
    render(<ProfileView scopePath="/home/me/repo-a" profile={null} />);
    expect(screen.getByText(/no profile generated yet/i)).toBeInTheDocument();
  });

  it("can refresh from the empty state to populate a profile", async () => {
    render(<ProfileView scopePath="/home/me/repo-a" profile={null} />);

    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));

    await waitFor(() => expect(screen.getByText(/Refreshed body/)).toBeInTheDocument());
    expect(window.api.refreshProfile).toHaveBeenCalledWith("/home/me/repo-a");
  });
});
