import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ContextMenu, type ContextMenuItem } from "@/components/_ui/ContextMenu/ContextMenu";

// Radix DropdownMenu uses pointer capture (absent in jsdom). Open via the
// keyboard path instead: focus the trigger and press Enter.
function openMenu() {
  const trigger = screen.getByRole("button", { name: "menu" });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: "Enter" });
}

describe("ContextMenu", () => {
  it("runs an item's onSelect when the item is activated", async () => {
    const onSelect = vi.fn();
    const items: ContextMenuItem[] = [{ label: "Rename", onSelect }];
    render(<ContextMenu items={items} trigger={<button aria-label="menu">⋯</button>} />);

    openMenu();
    fireEvent.click(await screen.findByText("Rename"));

    await waitFor(() => expect(onSelect).toHaveBeenCalledTimes(1));
  });

  it("gives the default icon-only trigger an accessible name", () => {
    const items: ContextMenuItem[] = [{ label: "Rename", onSelect: vi.fn() }];

    const { rerender } = render(<ContextMenu items={items} />);
    expect(screen.getByRole("button", { name: "More actions" })).toBeInTheDocument();

    rerender(<ContextMenu items={items} triggerLabel="Agent actions" />);
    expect(screen.getByRole("button", { name: "Agent actions" })).toBeInTheDocument();
  });

  it("does not run onSelect for a disabled item", async () => {
    const onSelect = vi.fn();
    const items: ContextMenuItem[] = [{ label: "Plan", onSelect, disabled: true }];
    render(<ContextMenu items={items} trigger={<button aria-label="menu">⋯</button>} />);

    openMenu();
    fireEvent.click(await screen.findByText("Plan"));

    // Radix blocks selection on a disabled item — onSelect never fires.
    await new Promise((r) => setTimeout(r, 0));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("does not let an item-select click fall through to a sibling beneath the menu", async () => {
    // Mirrors the sidebar row layout: a full-size clickable surface with the
    // menu overlaid on top. Selecting a menu item must NOT trigger the row's
    // onClick (the Radix modal close-on-select fall-through bug).
    const onRowClick = vi.fn();
    const onItemSelect = vi.fn();
    const items: ContextMenuItem[] = [{ label: "Rename", onSelect: onItemSelect }];

    render(
      <div style={{ position: "relative" }}>
        <button aria-label="row" onClick={onRowClick} style={{ width: 200, height: 40 }}>
          Row body
        </button>
        <div style={{ position: "absolute", right: 0, top: 0 }}>
          <ContextMenu items={items} trigger={<button aria-label="menu">⋯</button>} />
        </div>
      </div>,
    );

    openMenu();
    fireEvent.click(await screen.findByText("Rename"));

    // The item action runs (deferred to a microtask)…
    await waitFor(() => expect(onItemSelect).toHaveBeenCalledTimes(1));
    // …and the row underneath is never clicked.
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("renders a submenu trigger and reveals its nested options on open", async () => {
    const onLeaf = vi.fn();
    const items: ContextMenuItem[] = [
      {
        label: "Color",
        onSelect: () => {},
        submenu: [
          { label: "Default", onSelect: () => {}, selected: true },
          { label: "Red", onSelect: onLeaf },
        ],
      },
    ];
    render(<ContextMenu items={items} trigger={<button aria-label="menu">⋯</button>} />);

    openMenu();
    // The submenu trigger renders at the top level…
    const trigger = await screen.findByText("Color");
    // …its options are not visible until the submenu opens (ArrowRight).
    expect(screen.queryByText("Red")).toBeNull();
    fireEvent.keyDown(trigger, { key: "ArrowRight" });
    expect(await screen.findByText("Red")).toBeInTheDocument();
    expect(screen.getByText("Default")).toBeInTheDocument();
  });

  it("marks a selected leaf item (the current option) with a check", async () => {
    const items: ContextMenuItem[] = [
      {
        label: "Color",
        onSelect: () => {},
        submenu: [
          { label: "Default", onSelect: () => {} },
          { label: "Blue", onSelect: () => {}, selected: true },
        ],
      },
    ];
    const { container } = render(<ContextMenu items={items} trigger={<button aria-label="menu">⋯</button>} />);

    openMenu();
    const trigger = await screen.findByText("Color");
    fireEvent.keyDown(trigger, { key: "ArrowRight" });
    await screen.findByText("Blue");

    // lucide Check renders an <svg class="lucide-check …">; the selected leaf
    // (Blue) carries it, the unselected one (Default) does not.
    const blueRow = screen.getByText("Blue").closest("[role='menuitem']");
    const defaultRow = screen.getByText("Default").closest("[role='menuitem']");
    expect(blueRow?.querySelector(".lucide-check")).toBeTruthy();
    expect(defaultRow?.querySelector(".lucide-check")).toBeFalsy();
    expect(container).toBeTruthy();
  });

  it("runs a nested leaf's onSelect when selected", async () => {
    const onLeaf = vi.fn();
    const items: ContextMenuItem[] = [
      {
        label: "Color",
        onSelect: () => {},
        submenu: [{ label: "Red", onSelect: onLeaf }],
      },
    ];
    render(<ContextMenu items={items} trigger={<button aria-label="menu">⋯</button>} />);

    openMenu();
    const trigger = await screen.findByText("Color");
    fireEvent.keyDown(trigger, { key: "ArrowRight" });
    fireEvent.click(await screen.findByText("Red"));

    await waitFor(() => expect(onLeaf).toHaveBeenCalledTimes(1));
  });
});
