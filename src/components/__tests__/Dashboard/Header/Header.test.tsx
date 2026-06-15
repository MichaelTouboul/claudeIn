import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Header } from "@/components/Dashboard/Header/Header";

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
});
