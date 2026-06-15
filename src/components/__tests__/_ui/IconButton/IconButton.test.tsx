import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { IconButton } from "@/components/_ui/IconButton";

describe("IconButton", () => {
  it("exposes its accessible name from aria-label", () => {
    render(
      <IconButton aria-label="Profile">
        <span>i</span>
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "Profile" })).toBeInTheDocument();
  });

  it("defaults to type=button so it never submits a form", () => {
    render(<IconButton aria-label="x">i</IconButton>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("fires onClick", () => {
    const onClick = vi.fn();
    render(
      <IconButton aria-label="x" onClick={onClick}>
        i
      </IconButton>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("applies the active state classes", () => {
    render(
      <IconButton aria-label="x" active>
        i
      </IconButton>,
    );
    expect(screen.getByRole("button")).toHaveClass("text-accent");
  });
});
