import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Header } from "@/components/Dashboard/Header/Header";
import type { Project } from "@/lib/types";
import { PanelTabKind, usePanelStore } from "@/store/dashboard/usePanelStore";
import { useAppStore } from "@/store/useAppStore";

const proj = (id: string): Project => ({
  id, name: id, path: `/p/${id}`, claudeDir: `/p/${id}/.claude`,
  hasAgents: false, hasSkills: false, hasSettings: false, agentCount: 0, skillCount: 0,
});

beforeEach(() => {
  useAppStore.setState({ selectedProject: null });
  usePanelStore.setState({ isOpen: false, current: null });
});
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

  it("omits the Changes control when no project is selected", () => {
    render(<Header activeCount={0} connected onOpenChat={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /changes/i })).not.toBeInTheDocument();
  });

  it("opens a diff panel tab for the selected project on Changes click", () => {
    useAppStore.setState({ selectedProject: proj("acme") });
    render(<Header activeCount={0} connected onOpenChat={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /changes/i }));

    const current = usePanelStore.getState().current;
    expect(usePanelStore.getState().isOpen).toBe(true);
    expect(current?.kind).toBe(PanelTabKind.Diff);
    expect(current).toMatchObject({ kind: PanelTabKind.Diff, payload: { repoPath: "/p/acme" } });
  });
});
