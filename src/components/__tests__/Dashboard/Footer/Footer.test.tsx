import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Footer } from "@/components/Dashboard/Footer/Footer";

const getAppVersion = vi.fn();

beforeEach(() => {
  getAppVersion.mockReset().mockResolvedValue("0.1.0");
  window.api = { getAppVersion } as unknown as Window["api"];
});

describe("Footer", () => {
  it("renders the current app version prefixed with v", async () => {
    render(<Footer />);
    expect(await screen.findByText("v0.1.0")).toBeInTheDocument();
  });

  it("requests the version once from the IPC bridge", async () => {
    render(<Footer />);
    await waitFor(() => expect(getAppVersion).toHaveBeenCalledTimes(1));
  });

  it("renders nothing version-like before the IPC resolves", () => {
    getAppVersion.mockReturnValue(new Promise<string>(() => {}));
    render(<Footer />);
    expect(screen.queryByText(/^v\d/)).not.toBeInTheDocument();
  });
});
