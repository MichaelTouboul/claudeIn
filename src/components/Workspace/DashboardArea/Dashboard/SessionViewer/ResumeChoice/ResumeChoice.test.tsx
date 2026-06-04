import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ResumeChoice } from "./ResumeChoice";

describe("ResumeChoice", () => {
  it("renders both actions enabled", () => {
    render(<ResumeChoice onContinue={vi.fn()} onCompact={vi.fn()} />);
    expect(screen.getByRole("button", { name: /compact/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /continue as is/i })).toBeEnabled();
  });

  it("calls onCompact when the Compact button is clicked", () => {
    const onCompact = vi.fn();
    render(<ResumeChoice onContinue={vi.fn()} onCompact={onCompact} />);
    fireEvent.click(screen.getByRole("button", { name: /compact/i }));
    expect(onCompact).toHaveBeenCalledTimes(1);
  });

  it("calls onContinue when the Continue button is clicked", () => {
    const onContinue = vi.fn();
    render(<ResumeChoice onContinue={onContinue} onCompact={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /continue as is/i }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
