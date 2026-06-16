import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FavoriteRepoCard } from "@/components/Home/FavoriteReposGrid/FavoriteRepoCard";
import type { FavoriteRepo } from "@/lib/types";

function repo(logoDataUrl: string | null): FavoriteRepo {
  return { path: "/code/alpha", label: "Alpha", addedAt: "2026-06-11T00:00:00Z", logoDataUrl };
}

describe("FavoriteRepoCard", () => {
  it("renders the persisted logo via the Avatar src when present", () => {
    const dataUrl = "data:image/png;base64,AAAA";
    render(<FavoriteRepoCard repo={repo(dataUrl)} onOpen={vi.fn()} onRemove={vi.fn()} />);
    const logo = screen.getByRole("img", { name: "Alpha" });
    expect(logo).toHaveAttribute("src", dataUrl);
  });

  it("falls back to tinted initials when there is no logo", () => {
    render(<FavoriteRepoCard repo={repo(null)} onOpen={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    // "Alpha" → single word → first two letters, uppercased.
    expect(screen.getByText("AL")).toBeInTheDocument();
  });
});
