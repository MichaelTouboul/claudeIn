import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BrandName } from "@/components/BrandName/BrandName";

describe("BrandName", () => {
  it("renders the full name as one readable word", () => {
    const { container } = render(<BrandName />);
    // "Claude" + "In" live in sibling spans but read as a single word.
    expect(container.textContent).toBe("ClaudeIn");
  });

  it("colors the 'In' with the accent-text token ('Claude' inherits)", () => {
    render(<BrandName />);
    const inSpan = screen.getByText("In");
    expect(inSpan.tagName).toBe("SPAN");
    expect(inSpan.style.color).toBe("var(--color-accent-text)");
  });

  it("applies the wrapper className", () => {
    const { container } = render(<BrandName className="font-semibold" />);
    expect(container.firstChild).toHaveClass("font-semibold");
  });
});
