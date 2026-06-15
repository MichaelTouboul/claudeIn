import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Switch } from "@/components/_ui/Switch";

describe("Switch", () => {
  it("exposes a labelled switch role wired to the visible label", () => {
    render(<Switch label="Auto-optimize context" />);
    const sw = screen.getByRole("switch", { name: /auto-optimize context/i });
    expect(sw).toBeInTheDocument();
  });

  it("reflects the checked state via aria-checked", () => {
    render(<Switch checked label="On" onCheckedChange={vi.fn()} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("fires onCheckedChange with the next value on click", () => {
    const onCheckedChange = vi.fn();
    render(<Switch checked={false} aria-label="toggle" onCheckedChange={onCheckedChange} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("does not fire when disabled", () => {
    const onCheckedChange = vi.fn();
    render(<Switch disabled aria-label="toggle" onCheckedChange={onCheckedChange} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
