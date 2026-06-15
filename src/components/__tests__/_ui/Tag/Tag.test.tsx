import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Tag } from "@/components/_ui/Tag";

describe("Tag", () => {
  it("renders its label in the mono font", () => {
    render(<Tag>Claude Sonnet</Tag>);
    expect(screen.getByText("Claude Sonnet")).toHaveClass("font-mono");
  });

  it("applies the accent treatment when selected", () => {
    render(<Tag selected>sel</Tag>);
    expect(screen.getByText("sel")).toHaveClass("text-accent");
  });

  it("shows a remove affordance and calls onRemove", () => {
    const onRemove = vi.fn();
    render(<Tag onRemove={onRemove}>chip</Tag>);
    const remove = screen.getByRole("button", { name: /remove/i });
    fireEvent.click(remove);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("renders no remove affordance without onRemove", () => {
    render(<Tag>chip</Tag>);
    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
  });
});
