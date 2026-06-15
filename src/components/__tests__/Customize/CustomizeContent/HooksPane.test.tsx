import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HooksPane } from "@/components/Customize/CustomizeContent/HooksPane";
import type { HookEntry } from "@/lib/types";

const getHooks = vi.fn<(p?: string) => Promise<HookEntry[]>>();
const setHookEnabled = vi.fn<(id: string, enabled: boolean, p?: string) => Promise<HookEntry[]>>();

function hook(over: Partial<HookEntry> = {}): HookEntry {
  return {
    id: "h1",
    event: "PreToolUse",
    matcher: "Bash",
    command: "./guard.sh",
    source: "project",
    sourcePath: "/.claude/settings.json",
    enabled: true,
    editable: true,
    ...over,
  };
}

beforeEach(() => {
  getHooks.mockReset();
  setHookEnabled.mockReset();
  window.api = { getHooks, setHookEnabled } as unknown as Window["api"];
});

describe("HooksPane", () => {
  it("renders a row per hook with event, matcher and command", async () => {
    getHooks.mockResolvedValue([hook(), hook({ id: "h2", event: "Stop", matcher: null, command: "./notify.sh" })]);
    render(<HooksPane repoScope={null} />);

    expect(await screen.findByText("PreToolUse")).toBeInTheDocument();
    expect(screen.getByText("Bash")).toBeInTheDocument();
    expect(screen.getByText("./guard.sh")).toBeInTheDocument();
    expect(screen.getByText("Stop")).toBeInTheDocument();
  });

  it("toggling a hook calls setHookEnabled with the next value and adopts the returned list", async () => {
    getHooks.mockResolvedValue([hook({ enabled: true })]);
    setHookEnabled.mockResolvedValue([hook({ enabled: false })]);
    render(<HooksPane repoScope="/repo" />);

    const sw = await screen.findByRole("switch");
    expect(sw).toHaveAttribute("aria-checked", "true");
    fireEvent.click(sw);

    await waitFor(() => expect(setHookEnabled).toHaveBeenCalledWith("h1", false, "/repo"));
    await waitFor(() => expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false"));
  });

  it("renders managed (non-editable) hooks with the switch disabled", async () => {
    getHooks.mockResolvedValue([hook({ editable: false })]);
    render(<HooksPane repoScope={null} />);
    const sw = await screen.findByRole("switch");
    expect(sw).toBeDisabled();
    fireEvent.click(sw);
    expect(setHookEnabled).not.toHaveBeenCalled();
  });

  it("shows an empty state when there are no hooks", async () => {
    getHooks.mockResolvedValue([]);
    render(<HooksPane repoScope={null} />);
    await waitFor(() => expect(screen.getByText(/no hooks in this scope/i)).toBeInTheDocument());
  });
});
