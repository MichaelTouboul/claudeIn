import { render, screen } from "@testing-library/react";
import { createRef } from "react";
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

  // Radix `Trigger asChild`/`Slot` composes a ref onto its child to anchor the
  // floating layer; a Button that swallows the ref leaves the Popover Content
  // un-anchored (it never opens in a real browser). Guard the contract here.
  it("forwards a ref to the underlying <button> element", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Click</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current).toBe(screen.getByRole("button", { name: "Click" }));
  });

  it("forwards a ref to the slotted child through asChild", () => {
    // asChild slots an anchor: a callback ref (typed at the button's own
    // HTMLButtonElement contract) still receives the actual rendered node.
    let node: HTMLElement | null = null;
    render(
      <Button
        asChild
        ref={(el) => {
          node = el;
        }}
      >
        <a href="/x">link</a>
      </Button>,
    );
    expect(node).toBeInstanceOf(HTMLAnchorElement);
    expect(node).toBe(screen.getByRole("link", { name: "link" }));
  });
});
