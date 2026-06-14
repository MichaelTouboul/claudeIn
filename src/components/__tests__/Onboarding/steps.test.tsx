import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ConsentReposStep } from "@/components/Onboarding/ConsentReposStep/ConsentReposStep";
import { ConsentUserStep } from "@/components/Onboarding/ConsentUserStep/ConsentUserStep";
import { DoneStep } from "@/components/Onboarding/DoneStep/DoneStep";
import { ProfileReviewStep } from "@/components/Onboarding/ProfileReviewStep/ProfileReviewStep";
import { WelcomeStep } from "@/components/Onboarding/WelcomeStep/WelcomeStep";
import type { UserProfile } from "@/lib/types";

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
  it("renders and advances via 'Get started'", () => {
    const onNext = vi.fn();
    render(<WelcomeStep onNext={onNext} />);
    fireEvent.click(screen.getByRole("button", { name: /get started/i }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});

describe("ConsentUserStep", () => {
  it("authorizes with no skip affordance", () => {
    const onAuthorize = vi.fn();
    render(<ConsentUserStep onAuthorize={onAuthorize} />);
    expect(screen.queryByRole("button", { name: /passer|ignorer|skip/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /authorize/i }));
    expect(onAuthorize).toHaveBeenCalledTimes(1);
  });
});

describe("ConsentReposStep", () => {
  it("authorizes with no skip affordance", () => {
    const onAuthorize = vi.fn();
    render(<ConsentReposStep onAuthorize={onAuthorize} />);
    expect(screen.queryByRole("button", { name: /passer|ignorer|skip/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /authorize/i }));
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
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe("DoneStep", () => {
  it("renders and finishes", () => {
    const onFinish = vi.fn();
    render(<DoneStep onFinish={onFinish} />);
    expect(screen.getByText(/all set/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /finish/i }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("disables the button while finishing so completion can't be double-fired", () => {
    const onFinish = vi.fn();
    render(<DoneStep onFinish={onFinish} />);
    const btn = screen.getByRole("button", { name: /finish/i });
    fireEvent.click(btn);
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    fireEvent.click(btn);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
