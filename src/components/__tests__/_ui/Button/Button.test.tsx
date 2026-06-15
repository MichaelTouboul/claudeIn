import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/_ui/Button";

describe("Button", () => {
  it("renders a secondary intent treatment", () => {
    render(
      <Button intent="secondary">
        Save
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Save" })).toHaveClass("bg-surface-2", "border-border-strong");
  });

  it("renders leading and trailing adornments around the label", () => {
    render(
      <Button leftIcon={<span data-testid="lead">L</span>} rightIcon={<span data-testid="trail">R</span>}>
        Go
      </Button>,
    );
    expect(screen.getByTestId("lead")).toBeInTheDocument();
    expect(screen.getByTestId("trail")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /go/i })).toBeInTheDocument();
  });

  it("forwards a single child through asChild without adornments", () => {
    render(
      <Button asChild leftIcon={<span data-testid="lead">L</span>}>
        <a href="/x">link</a>
      </Button>,
    );
    // asChild forwards to the anchor; leftIcon is intentionally not injected
    expect(screen.getByRole("link", { name: "link" })).toBeInTheDocument();
    expect(screen.queryByTestId("lead")).not.toBeInTheDocument();
  });
});
