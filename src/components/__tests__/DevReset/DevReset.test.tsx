import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DevReset } from "@/components/DevReset/DevReset";
import { AppPage, useAppStore } from "@/store/useAppStore";

const resetUser = vi.fn<() => Promise<void>>();

beforeEach(() => {
  useAppStore.setState({ currentPage: AppPage.Home, selectedProject: null });
  resetUser.mockReset().mockResolvedValue(undefined);
  window.api = { resetUser } as unknown as Window["api"];
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("DevReset", () => {
  it("renders the dev reset control when import.meta.env.DEV is true", () => {
    vi.stubEnv("DEV", true);
    render(<DevReset />);
    expect(screen.getByRole("button", { name: /reset onboarding \(dev\)/i })).toBeInTheDocument();
  });

  it("renders nothing in a production build (import.meta.env.DEV false)", () => {
    vi.stubEnv("DEV", false);
    const { container } = render(<DevReset />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("button", { name: /reset onboarding/i })).toBeNull();
  });

  it("clears the user via resetUser and navigates back to onboarding on click", async () => {
    vi.stubEnv("DEV", true);
    render(<DevReset />);
    const btn = screen.getByRole("button", { name: /reset onboarding \(dev\)/i });

    await act(async () => {
      fireEvent.click(btn);
    });

    await waitFor(() => expect(resetUser).toHaveBeenCalledTimes(1));
    expect(useAppStore.getState().currentPage).toBe(AppPage.Onboarding);
  });

  it("is keyboard-focusable with an accessible name", () => {
    vi.stubEnv("DEV", true);
    render(<DevReset />);
    const btn = screen.getByRole("button", { name: /reset onboarding \(dev\)/i });
    btn.focus();
    expect(btn).toHaveFocus();
  });
});
