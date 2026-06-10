import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Candidate, ScopeProfile } from "@/types/onboarding.types";

import { OnboardingWizard } from "./OnboardingWizard";

function makeProfile(scopePath: string): ScopeProfile {
  return { scopePath, scope: "project", profileMd: "# md", generatedAt: "2026-06-10T00:00:00Z" };
}

const CANDIDATES: Candidate[] = [
  { path: "/home/me/repo-a", scope: "project", hasClaude: true, plugins: ["babysitter"] },
  { path: "/home/me/repo-b", scope: "project", hasClaude: true, plugins: [] },
];

describe("OnboardingWizard", () => {
  beforeEach(() => {
    localStorage.clear();
    window.api = {
      getOnboardingScan: vi.fn(async () => CANDIDATES),
      listProfiles: vi.fn(async () => []),
      ingestScope: vi.fn(async (scopePath: string) => makeProfile(scopePath)),
    } as unknown as Window["api"];
  });

  it("renders scanned candidates with paths, plugin badges and accessible checkboxes", async () => {
    render(<OnboardingWizard onDone={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("/home/me/repo-a")).toBeInTheDocument());
    expect(screen.getByText("/home/me/repo-b")).toBeInTheDocument();
    expect(screen.getByText("babysitter")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /repo-a/ })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /repo-b/ })).toBeInTheDocument();
  });

  it("ingests each selected scope and advances per-scope status to Done", async () => {
    render(<OnboardingWizard onDone={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("/home/me/repo-a")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("checkbox", { name: /repo-a/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /repo-b/ }));
    fireEvent.click(screen.getByRole("button", { name: /add selected/i }));

    await waitFor(() => {
      const rowA = screen.getByTestId("ingest-row-/home/me/repo-a");
      const rowB = screen.getByTestId("ingest-row-/home/me/repo-b");
      expect(within(rowA).getByText("Done")).toBeInTheDocument();
      expect(within(rowB).getByText("Done")).toBeInTheDocument();
    });
    expect(window.api.ingestScope).toHaveBeenCalledTimes(2);
  });

  it("an ingest error on one scope shows Failed without blocking the others", async () => {
    (window.api.ingestScope as ReturnType<typeof vi.fn>).mockImplementation(
      async (scopePath: string) => {
        if (scopePath === "/home/me/repo-a") throw new Error("boom");
        return makeProfile(scopePath);
      },
    );
    render(<OnboardingWizard onDone={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("/home/me/repo-a")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("checkbox", { name: /repo-a/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /repo-b/ }));
    fireEvent.click(screen.getByRole("button", { name: /add selected/i }));

    await waitFor(() => {
      const rowA = screen.getByTestId("ingest-row-/home/me/repo-a");
      const rowB = screen.getByTestId("ingest-row-/home/me/repo-b");
      expect(within(rowA).getByText("Failed")).toBeInTheDocument();
      expect(within(rowB).getByText("Done")).toBeInTheDocument();
    });
  });

  it("calls onDone when finishing after all scopes are terminal", async () => {
    const onDone = vi.fn();
    render(<OnboardingWizard onDone={onDone} />);
    await waitFor(() => expect(screen.getByText("/home/me/repo-a")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("checkbox", { name: /repo-a/ }));
    fireEvent.click(screen.getByRole("button", { name: /add selected/i }));

    const finish = await screen.findByRole("button", { name: /enter app/i });
    await waitFor(() => expect(finish).toBeEnabled());
    fireEvent.click(finish);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("lets the user skip onboarding without ingesting", async () => {
    const onDone = vi.fn();
    render(<OnboardingWizard onDone={onDone} />);
    await waitFor(() => expect(screen.getByText("/home/me/repo-a")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /skip for now/i }));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(window.api.ingestScope).not.toHaveBeenCalled();
  });
});
