import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RepoScopeDropdown } from "@/components/Customize/CustomizeSidebar/RepoScopeDropdown";
import type { FavoriteRepo } from "@/lib/types";

function repo(path: string, label: string | null = null): FavoriteRepo {
  return { path, label, addedAt: "2026-06-11T00:00:00Z" };
}

describe("RepoScopeDropdown", () => {
  it("has an accessible name and lists the favorite repos", () => {
    render(<RepoScopeDropdown repos={[repo("/code/alpha", "Alpha")]} value={null} onChange={vi.fn()} />);
    const select = screen.getByRole("combobox", { name: /repository scope/i });
    expect(select).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /alpha/i })).toBeInTheDocument();
  });

  it("emits the selected repo path on change", () => {
    const onChange = vi.fn();
    render(<RepoScopeDropdown repos={[repo("/code/alpha", "Alpha")]} value={null} onChange={onChange} />);
    fireEvent.change(screen.getByRole("combobox", { name: /repository scope/i }), {
      target: { value: "/code/alpha" },
    });
    expect(onChange).toHaveBeenCalledWith("/code/alpha");
  });

  it("shows a disabled empty hint when there are no favorite repos", () => {
    render(<RepoScopeDropdown repos={[]} value={null} onChange={vi.fn()} />);
    expect(screen.getByText(/no favorite repos yet/i)).toBeInTheDocument();
    // The select stays operable (Personal scope) but exposes only the hint state.
    expect(screen.getByRole("combobox", { name: /repository scope/i })).toBeDisabled();
  });
});
