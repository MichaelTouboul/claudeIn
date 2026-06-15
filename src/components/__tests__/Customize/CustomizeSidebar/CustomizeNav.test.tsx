import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CustomizeNav } from "@/components/Customize/CustomizeSidebar/CustomizeNav";
import { CustomizeSection } from "@/store/customize/useCustomizeStore";

describe("CustomizeNav", () => {
  it("exposes a tablist with one tab per section and marks the active one selected", () => {
    render(<CustomizeNav active={CustomizeSection.Connectors} onSelect={vi.fn()} />);
    const tablist = screen.getByRole("tablist", { name: /customize sections/i });
    expect(tablist).toBeInTheDocument();

    const skills = screen.getByRole("tab", { name: /skills/i });
    const connectors = screen.getByRole("tab", { name: /connectors/i });
    expect(connectors).toHaveAttribute("aria-selected", "true");
    expect(skills).toHaveAttribute("aria-selected", "false");
  });

  it("renders Profile as the first tab", () => {
    render(<CustomizeNav active={CustomizeSection.Profile} onSelect={vi.fn()} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveAccessibleName(/profile/i);
    expect(screen.getByRole("tab", { name: /profile/i })).toHaveAttribute("aria-selected", "true");
  });

  it("selects a section on click", () => {
    const onSelect = vi.fn();
    render(<CustomizeNav active={CustomizeSection.Connectors} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("tab", { name: /skills/i }));
    expect(onSelect).toHaveBeenCalledWith(CustomizeSection.Skills);
  });

  it("moves selection with ArrowDown / ArrowUp", () => {
    const onSelect = vi.fn();
    render(<CustomizeNav active={CustomizeSection.Skills} onSelect={onSelect} />);
    fireEvent.keyDown(screen.getByRole("tab", { name: /skills/i }), { key: "ArrowDown" });
    expect(onSelect).toHaveBeenCalledWith(CustomizeSection.Connectors);

    onSelect.mockClear();
    fireEvent.keyDown(screen.getByRole("tab", { name: /skills/i }), { key: "ArrowUp" });
    expect(onSelect).toHaveBeenCalledWith(CustomizeSection.Profile);
  });

  it("the active tab is keyboard-reachable (tabIndex 0) and inactive ones are not", () => {
    render(<CustomizeNav active={CustomizeSection.Connectors} onSelect={vi.fn()} />);
    expect(screen.getByRole("tab", { name: /connectors/i })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: /skills/i })).toHaveAttribute("tabindex", "-1");
  });

  it("shows a trailing count for a section when one is supplied", () => {
    render(
      <CustomizeNav
        active={CustomizeSection.Profile}
        onSelect={vi.fn()}
        counts={{ [CustomizeSection.Connectors]: 4 }}
      />,
    );
    const connectors = screen.getByRole("tab", { name: /connectors/i });
    expect(connectors).toHaveTextContent("4");
  });
});
