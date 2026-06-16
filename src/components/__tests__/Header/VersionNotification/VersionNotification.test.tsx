import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VersionNotification } from "@/components/Header/VersionNotification/VersionNotification";
import {
  useVersionStore,
  VERSION_ACK_STORAGE_KEY,
} from "@/store/useVersionStore";

const reload = vi.fn();

function openPopover() {
  fireEvent.click(screen.getByRole("button", { name: /version|update/i }));
}

beforeEach(() => {
  localStorage.clear();
  reload.mockReset();
  useVersionStore.setState({ running: "1.0.0", latest: null, acknowledged: null });
  vi.stubGlobal("location", { reload } as unknown as Location);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("VersionNotification", () => {
  it("renders the trigger button with no badge when there is no update", () => {
    render(<VersionNotification />);
    expect(
      screen.getByRole("button", { name: /version|update/i }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("version-dot")).not.toBeInTheDocument();
  });

  it("shows the update dot when a newer version arrives", () => {
    render(<VersionNotification />);
    act(() => {
      useVersionStore.getState().ingest("1.0.1");
    });
    expect(screen.getByTestId("version-dot")).toBeInTheDocument();
  });

  it("opening the popover surfaces the new version and a reload action", () => {
    act(() => {
      useVersionStore.getState().ingest("1.0.1");
    });
    render(<VersionNotification />);

    openPopover();
    expect(screen.getAllByText(/1\.0\.1/).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: /reload to update/i }),
    ).toBeInTheDocument();
  });

  it("Reload acknowledges the version (persisted) and reloads the renderer", () => {
    act(() => {
      useVersionStore.getState().ingest("1.0.1");
    });
    render(<VersionNotification />);

    openPopover();
    fireEvent.click(screen.getByRole("button", { name: /reload to update/i }));

    expect(reload).toHaveBeenCalledTimes(1);
    expect(useVersionStore.getState().acknowledged).toBe("1.0.1");
    expect(localStorage.getItem(VERSION_ACK_STORAGE_KEY)).toBe("1.0.1");
  });
});
