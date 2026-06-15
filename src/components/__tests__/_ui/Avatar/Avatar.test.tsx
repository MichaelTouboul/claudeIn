import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Avatar } from "@/components/_ui/Avatar";

describe("Avatar", () => {
  it("renders initials from a two-word name", () => {
    render(<Avatar name="Marie Dubois" />);
    expect(screen.getByText("MD")).toBeInTheDocument();
  });

  it("renders the first two letters for a single-word name", () => {
    render(<Avatar name="claudein" />);
    expect(screen.getByText("CL")).toBeInTheDocument();
  });

  it("falls back to ? for an empty name", () => {
    render(<Avatar name="   " />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("applies the hue class on the initials fallback", () => {
    render(<Avatar name="Ada" hue="green" data-testid="av" />);
    expect(screen.getByTestId("av")).toHaveClass("agent-color-green");
  });

  it("renders an image with alt text when src is provided", () => {
    render(<Avatar name="Ada" src="/x.png" />);
    const img = screen.getByRole("img", { name: "Ada" });
    expect(img).toHaveAttribute("src", "/x.png");
  });

  it("uses the square shape when requested", () => {
    render(<Avatar name="Ada" shape="square" data-testid="av" />);
    expect(screen.getByTestId("av")).toHaveClass("rounded-md");
  });
});
