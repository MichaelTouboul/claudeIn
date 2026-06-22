import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Header } from "@/components/Dashboard/Header/Header";

afterEach(() => vi.restoreAllMocks());

describe("Header", () => {
  it("renders a Customize control and fires onCustomize on click", () => {
    const onCustomize = vi.fn();
    render(
      <Header activeCount={0} connected onOpenChat={vi.fn()} onGoHome={vi.fn()} onCustomize={onCustomize} />,
    );
    const button = screen.getByRole("button", { name: /customize/i });
    fireEvent.click(button);
    expect(onCustomize).toHaveBeenCalledTimes(1);
  });

  it("omits the Customize control when onCustomize is not provided", () => {
    render(<Header activeCount={0} connected onOpenChat={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /customize/i })).not.toBeInTheDocument();
  });

  it("reserves the notification-overlay gutter on the right so the overlay never overlaps the Chat control", () => {
    render(<Header activeCount={0} connected onOpenChat={vi.fn()} onCustomize={vi.fn()} />);
    const bar = screen.getByRole("button", { name: /chat/i }).closest("div.titlebar-drag");
    expect(bar).not.toBeNull();
    expect(bar?.className).toContain("pr-[var(--header-overlay-gutter)]");
    expect(bar?.className).not.toContain("pr-16");
  });
});
