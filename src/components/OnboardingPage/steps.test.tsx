import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { UserProfile } from "@/types/user.types";

import { ConsentReposStep } from "./ConsentReposStep/ConsentReposStep";
import { ConsentUserStep } from "./ConsentUserStep/ConsentUserStep";
import { DoneStep } from "./DoneStep/DoneStep";
import { ProfileReviewStep } from "./ProfileReviewStep/ProfileReviewStep";
import { WelcomeStep } from "./WelcomeStep/WelcomeStep";

function makeProfile(): UserProfile {
  return {
    claudeUserPath: "/home/u/.claude",
    name: "Ada",
    role: null,
    plugins: [],
    capabilities: { agents: { count: 0, names: [] }, skills: 0, mcp: 0, hooks: 0 },
    summary: "A tidy setup.",
    domains: [],
    workflow: null,
    onboardingCompletedAt: null,
    generatedAt: null,
    updatedAt: null,
  };
}

describe("WelcomeStep", () => {
  it("renders and advances via 'Commencer'", () => {
    const onNext = vi.fn();
    render(<WelcomeStep onNext={onNext} />);
    fireEvent.click(screen.getByRole("button", { name: /commencer/i }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});

describe("ConsentUserStep", () => {
  it("authorizes with no skip affordance", () => {
    const onAuthorize = vi.fn();
    render(<ConsentUserStep onAuthorize={onAuthorize} />);
    expect(screen.queryByRole("button", { name: /passer|ignorer|skip/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /autoriser/i }));
    expect(onAuthorize).toHaveBeenCalledTimes(1);
  });
});

describe("ConsentReposStep", () => {
  it("authorizes with no skip affordance", () => {
    const onAuthorize = vi.fn();
    render(<ConsentReposStep onAuthorize={onAuthorize} />);
    expect(screen.queryByRole("button", { name: /passer|ignorer|skip/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /autoriser/i }));
    expect(onAuthorize).toHaveBeenCalledTimes(1);
  });
});

describe("ProfileReviewStep", () => {
  it("renders the profile and confirms", () => {
    const onConfirm = vi.fn();
    render(
      <ProfileReviewStep
        profile={makeProfile()}
        onSave={(p) => Promise.resolve(p)}
        onConfirm={onConfirm}
      />,
    );
    expect(screen.getByText(/A tidy setup\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /confirmer/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe("DoneStep", () => {
  it("renders and finishes", () => {
    const onFinish = vi.fn();
    render(<DoneStep onFinish={onFinish} />);
    expect(screen.getByText(/tout est prêt/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /terminer/i }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
