import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ScopeProfile } from "@/types/onboarding.types";

import { OnboardingGate } from "./OnboardingGate";

function makeProfile(scopePath: string): ScopeProfile {
  return { scopePath, scope: "project", profileMd: "# md", generatedAt: "2026-06-10T00:00:00Z" };
}

describe("OnboardingGate", () => {
  beforeEach(() => {
    localStorage.clear();
    window.api = {
      getOnboardingScan: vi.fn(async () => []),
      listProfiles: vi.fn(async () => []),
      ingestScope: vi.fn(async (scopePath: string) => makeProfile(scopePath)),
    } as unknown as Window["api"];
  });

  it("shows the wizard when not onboarded", async () => {
    render(<OnboardingGate />);
    await waitFor(() =>
      expect(screen.getByRole("dialog", { name: /onboarding/i })).toBeInTheDocument(),
    );
  });

  it("does not show the wizard once profiles exist", async () => {
    (window.api.listProfiles as ReturnType<typeof vi.fn>).mockResolvedValue([makeProfile("/a")]);
    render(<OnboardingGate />);
    // Profiles resolve asynchronously; the gate must settle to "onboarded".
    await waitFor(() => expect(window.api.listProfiles).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: /onboarding/i })).not.toBeInTheDocument(),
    );
  });

  it("does not show the wizard when the persisted flag is set", async () => {
    localStorage.setItem("claudein:onboardingCompleted", "1");
    render(<OnboardingGate />);
    await waitFor(() => expect(window.api.listProfiles).toHaveBeenCalled());
    expect(screen.queryByRole("dialog", { name: /onboarding/i })).not.toBeInTheDocument();
  });
});
