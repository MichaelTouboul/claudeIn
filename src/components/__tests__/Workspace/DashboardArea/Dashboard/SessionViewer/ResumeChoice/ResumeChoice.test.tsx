import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ResumeChoice } from "@/components/Workspace/DashboardArea/Dashboard/SessionViewer/ResumeChoice/ResumeChoice";

describe("ResumeChoice", () => {
  it("renders both actions enabled", () => {
    render(<ResumeChoice recommended="continue" onContinue={vi.fn()} onCompact={vi.fn()} />);
    expect(screen.getByRole("button", { name: /compact/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /continue as is/i })).toBeEnabled();
  });

  it("calls onCompact when the Compact button is clicked", () => {
    const onCompact = vi.fn();
    render(<ResumeChoice recommended="continue" onContinue={vi.fn()} onCompact={onCompact} />);
    fireEvent.click(screen.getByRole("button", { name: /compact/i }));
    expect(onCompact).toHaveBeenCalledTimes(1);
  });

  it("calls onContinue when the Continue button is clicked", () => {
    const onContinue = vi.fn();
    render(<ResumeChoice recommended="continue" onContinue={onContinue} onCompact={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /continue as is/i }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("tags Compact as recommended only when recommended='compact'", () => {
    render(<ResumeChoice recommended="compact" onContinue={vi.fn()} onCompact={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Compact (recommended)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue as is" })).toBeInTheDocument();
  });

  it("tags Continue as recommended when recommended='continue'", () => {
    render(<ResumeChoice recommended="continue" onContinue={vi.fn()} onCompact={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Continue as is (recommended)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Compact" })).toBeInTheDocument();
  });
});
