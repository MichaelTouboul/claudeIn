import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ConsentReposStep } from "@/components/Onboarding/ConsentReposStep/ConsentReposStep";
import { ConsentUserStep } from "@/components/Onboarding/ConsentUserStep/ConsentUserStep";
import { DoneStep } from "@/components/Onboarding/DoneStep/DoneStep";
import { ProfileReviewStep } from "@/components/Onboarding/ProfileReviewStep/ProfileReviewStep";
import { WelcomeStep } from "@/components/Onboarding/WelcomeStep/WelcomeStep";
import type { UserProfile } from "@/lib/types";

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    claudeUserPath: "/home/u/.claude",
    name: "Ada",
    role: "A backend engineer working in TypeScript and Node.",
    plugins: [],
    capabilities: { agents: { count: 17, names: [] }, skills: 5, mcp: 2, hooks: 4 },
    stack: ["TypeScript", "Node"],
    domains: ["backend", "infra"],
    onboardingCompletedAt: null,
    generatedAt: null,
    updatedAt: null,
    ...overrides,
  };
}

describe("WelcomeStep", () => {
  it("renders and advances via 'Get started'", () => {
    const onNext = vi.fn();
    render(<WelcomeStep stepIndex={0} onNext={onNext} />);
    fireEvent.click(screen.getByRole("button", { name: /get started/i }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});

describe("ConsentUserStep", () => {
  it("authorizes with no skip affordance", () => {
    const onAuthorize = vi.fn();
    render(<ConsentUserStep stepIndex={1} onBack={vi.fn()} onAuthorize={onAuthorize} />);
    expect(screen.queryByRole("button", { name: /passer|ignorer|skip/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /authorize/i }));
    expect(onAuthorize).toHaveBeenCalledTimes(1);
  });

  it("steps back via 'Back'", () => {
    const onBack = vi.fn();
    render(<ConsentUserStep stepIndex={1} onBack={onBack} onAuthorize={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe("ConsentReposStep", () => {
  it("authorizes with no skip affordance", () => {
    const onAuthorize = vi.fn();
    render(<ConsentReposStep stepIndex={4} onBack={vi.fn()} onAuthorize={onAuthorize} />);
    expect(screen.queryByRole("button", { name: /passer|ignorer|skip/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /authorize/i }));
    expect(onAuthorize).toHaveBeenCalledTimes(1);
  });
});

describe("ProfileReviewStep", () => {
  it("renders the identity, stat strip, stack chips, domains and confirms", () => {
    const onConfirm = vi.fn();
    render(
      <ProfileReviewStep
        stepIndex={3}
        profile={makeProfile()}
        onSave={(p) => Promise.resolve(p)}
        onConfirm={onConfirm}
        onBack={vi.fn()}
      />,
    );
    // identity
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("~/.claude")).toBeInTheDocument();
    // stat strip — counts from capabilities
    expect(screen.getByText("17")).toBeInTheDocument();
    expect(screen.getByText("agents")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("skills")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("MCP servers")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("hooks")).toBeInTheDocument();
    // stack chips (NOT the role sentence)
    expect(screen.getByText("Stack")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Node")).toBeInTheDocument();
    expect(
      screen.queryByText("A backend engineer working in TypeScript and Node."),
    ).not.toBeInTheDocument();
    // domains chips
    expect(screen.getByText("backend")).toBeInTheDocument();
    expect(screen.getByText("infra")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("omits the Stack section when the stack array is empty", () => {
    render(
      <ProfileReviewStep
        stepIndex={3}
        profile={makeProfile({ stack: [] })}
        onSave={(p) => Promise.resolve(p)}
        onConfirm={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(screen.queryByText("Stack")).not.toBeInTheDocument();
  });

  it("renders a Back button that calls onBack", () => {
    const onBack = vi.fn();
    render(
      <ProfileReviewStep
        stepIndex={3}
        profile={makeProfile()}
        onSave={(p) => Promise.resolve(p)}
        onConfirm={vi.fn()}
        onBack={onBack}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("shows the home directory chip as ~/.claude even for an absolute path", () => {
    render(
      <ProfileReviewStep
        stepIndex={3}
        profile={makeProfile({ claudeUserPath: "/Users/ada/.claude" })}
        onSave={(p) => Promise.resolve(p)}
        onConfirm={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByText("~/.claude")).toBeInTheDocument();
  });

  it("Edit opens the inline editor reaching onSave", async () => {
    const onSave = vi
      .fn<(p: UserProfile) => Promise<UserProfile>>()
      .mockImplementation((p) => Promise.resolve(p));
    render(
      <ProfileReviewStep
        stepIndex={3}
        profile={makeProfile()}
        onSave={onSave}
        onConfirm={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Grace" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /save/i }));
    });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].name).toBe("Grace");
  });
});

describe("DoneStep", () => {
  it("renders and finishes", () => {
    const onFinish = vi.fn();
    render(<DoneStep stepIndex={6} onFinish={onFinish} />);
    expect(screen.getByText(/all set/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /open claudein/i }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("disables the button while finishing so completion can't be double-fired", () => {
    const onFinish = vi.fn();
    render(<DoneStep stepIndex={6} onFinish={onFinish} />);
    const btn = screen.getByRole("button", { name: /open claudein/i });
    fireEvent.click(btn);
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    fireEvent.click(btn);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
