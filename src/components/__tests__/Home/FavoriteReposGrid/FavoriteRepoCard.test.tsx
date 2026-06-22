import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FavoriteRepoCard } from "@/components/Home/FavoriteReposGrid/FavoriteRepoCard";
import type { FavoriteRepo } from "@/lib/types";

function repo(overrides: Partial<FavoriteRepo> = {}): FavoriteRepo {
  return {
    path: "/code/alpha",
    label: "Alpha is a monorepo for analytics.",
    addedAt: "2026-06-11T00:00:00Z",
    logoDataUrl: null,
    ...overrides,
  };
}

describe("FavoriteRepoCard", () => {
  it("renders the persisted logo via the Avatar src when present", () => {
    const dataUrl = "data:image/png;base64,AAAA";
    render(<FavoriteRepoCard repo={repo({ logoDataUrl: dataUrl })} onOpen={vi.fn()} onRemove={vi.fn()} />);
    // Avatar alt text is the repo NAME (basename), not the long label.
    const logo = screen.getByRole("img", { name: "alpha" });
    expect(logo).toHaveAttribute("src", dataUrl);
  });

  it("falls back to tinted initials derived from the repo name", () => {
    render(<FavoriteRepoCard repo={repo({ logoDataUrl: null })} onOpen={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    // "alpha" → single word → first two letters, uppercased.
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("shows the folder name as the bold title and the description as the subtitle", () => {
    render(<FavoriteRepoCard repo={repo()} onOpen={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(screen.getByText("Alpha is a monorepo for analytics.")).toBeInTheDocument();
  });

  it("keeps the full path as a tooltip on the name, not as a visible line", () => {
    render(<FavoriteRepoCard repo={repo()} onOpen={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText("alpha")).toHaveAttribute("title", "/code/alpha");
    // The path is never rendered as its own visible text line.
    expect(screen.queryByText("/code/alpha")).not.toBeInTheDocument();
  });

  it("renders no subtitle line when the description (label) is null", () => {
    const { container } = render(
      <FavoriteRepoCard repo={repo({ label: null })} onOpen={vi.fn()} onRemove={vi.fn()} />,
    );
    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(container.querySelector("[data-repo-subtitle]")).toBeNull();
  });

  it("labels the actions with the repo name", () => {
    render(<FavoriteRepoCard repo={repo()} onOpen={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Open alpha" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove alpha" })).toBeInTheDocument();
  });
});
