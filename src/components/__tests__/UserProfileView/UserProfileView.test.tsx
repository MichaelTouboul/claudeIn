import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UserProfileView } from "@/components/UserProfileView/UserProfileView";
import type { UserProfile } from "@/lib/types";

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    claudeUserPath: "/home/u/.claude",
    name: "Ada",
    role: "Engineer",
    plugins: ["babysitter"],
    capabilities: { agents: { count: 2, names: ["a", "b"] }, skills: 1, mcp: 4, hooks: 3 },
    summary: "A tidy setup.",
    domains: ["backend", "infra"],
    workflow: "TDD",
    onboardingCompletedAt: "x",
    generatedAt: null,
    updatedAt: null,
    ...overrides,
  };
}

describe("UserProfileView (read mode)", () => {
  it("shows deterministic fields read-only and narrative fields", () => {
    render(<UserProfileView profile={makeProfile()} onSave={vi.fn()} />);
    expect(screen.getByText("/home/u/.claude")).toBeInTheDocument();
    expect(screen.getByText("babysitter")).toBeInTheDocument();
    expect(screen.getByText(/A tidy setup\./)).toBeInTheDocument();
    expect(screen.getByText("TDD")).toBeInTheDocument();
    // capability counts are rendered
    expect(screen.getByText("Ada")).toBeInTheDocument();
  });

  it("renders a first-run empty state when profile is null", () => {
    render(<UserProfileView profile={null} onSave={vi.fn()} />);
    expect(screen.getByText(/no profile/i)).toBeInTheDocument();
  });
});

describe("UserProfileView (edit mode)", () => {
  it("edits narrative + identity fields and saves them; deterministic fields are untouched", async () => {
    const onSave = vi.fn<(p: UserProfile) => Promise<UserProfile>>().mockImplementation((p) => Promise.resolve(p));
    render(<UserProfileView profile={makeProfile()} onSave={onSave} />);

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Grace" } });
    fireEvent.change(screen.getByLabelText(/summary/i), { target: { value: "Updated summary." } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /save/i }));
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0];
    expect(saved.name).toBe("Grace");
    expect(saved.summary).toBe("Updated summary.");
    // deterministic field preserved
    expect(saved.claudeUserPath).toBe("/home/u/.claude");
    expect(saved.plugins).toEqual(["babysitter"]);
  });

  it("cancel discards edits", () => {
    render(<UserProfileView profile={makeProfile()} onSave={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Grace" } });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Grace")).not.toBeInTheDocument();
  });
});
