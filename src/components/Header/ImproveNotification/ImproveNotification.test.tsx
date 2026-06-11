import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ACKNOWLEDGED_STORAGE_KEY,
  useImproveStore,
} from "@/store/useImproveStore";
import type { ImproveRequest } from "@/types/improve.types";
import { ImproveStatus, ImproveType } from "@/types/improve.types";

import { ImproveNotification } from "./ImproveNotification";

function makeRequest(overrides: Partial<ImproveRequest> = {}): ImproveRequest {
  return {
    id: "req-1",
    createdAt: "2026-06-11T10:00:00Z",
    type: ImproveType.Feature,
    title: "Add dark mode",
    description: "A dark theme toggle",
    acceptance: ["toggle exists"],
    transcript: [],
    status: ImproveStatus.Merged,
    summary: "Shipped a dark theme",
    ...overrides,
  };
}

const reload = vi.fn();

function openPopover() {
  fireEvent.click(screen.getByRole("button", { name: /updates|improvements? ready/i }));
}

beforeEach(() => {
  localStorage.clear();
  reload.mockReset();
  useImproveStore.setState({ requests: {}, acknowledgedIds: new Set() });
  vi.stubGlobal("location", { reload } as unknown as Location);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ImproveNotification", () => {
  it("always renders the trigger button, even with no merged improvements", () => {
    render(<ImproveNotification />);
    expect(
      screen.getByRole("button", { name: /updates|improvements? ready/i }),
    ).toBeInTheDocument();
  });

  it("shows no count badge when there are no merged improvements", () => {
    render(<ImproveNotification />);
    expect(screen.queryByTestId("improve-count")).not.toBeInTheDocument();
  });

  it("opening with no improvements shows a discreet empty state", () => {
    render(<ImproveNotification />);
    openPopover();
    expect(screen.getByText(/no updates yet/i)).toBeInTheDocument();
  });

  it("surfaces a count badge when a merged improvement arrives", () => {
    render(<ImproveNotification />);
    act(() => {
      useImproveStore.getState().ingest(makeRequest());
    });
    expect(screen.getByTestId("improve-count")).toHaveTextContent("1");
  });

  it("opening the trigger lists the merged improvement's title and summary", () => {
    act(() => {
      useImproveStore.getState().ingest(makeRequest());
    });
    render(<ImproveNotification />);

    openPopover();
    expect(screen.getByText("Add dark mode")).toBeInTheDocument();
    expect(screen.getByText("Shipped a dark theme")).toBeInTheDocument();
  });

  it("Update reloads the renderer and acknowledges (persisted, no longer shown)", () => {
    act(() => {
      useImproveStore.getState().ingest(makeRequest());
    });
    render(<ImproveNotification />);

    openPopover();
    fireEvent.click(screen.getByRole("button", { name: /update/i }));

    expect(reload).toHaveBeenCalledTimes(1);
    expect(useImproveStore.getState().acknowledgedIds.has("req-1")).toBe(true);
    const persisted = JSON.parse(localStorage.getItem(ACKNOWLEDGED_STORAGE_KEY) ?? "[]");
    expect(persisted).toContain("req-1");
  });

  it("Dismiss acknowledges without reloading", () => {
    act(() => {
      useImproveStore.getState().ingest(makeRequest());
    });
    render(<ImproveNotification />);

    openPopover();
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));

    expect(reload).not.toHaveBeenCalled();
    expect(useImproveStore.getState().acknowledgedIds.has("req-1")).toBe(true);
  });
});
