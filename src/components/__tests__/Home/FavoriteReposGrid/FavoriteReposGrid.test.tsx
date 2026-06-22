import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FavoriteReposGrid } from "@/components/Home/FavoriteReposGrid/FavoriteReposGrid";
import type { FavoriteRepo } from "@/lib/types";

function repo(path: string): FavoriteRepo {
  return { path, label: null, addedAt: "2026-06-11T00:00:00Z", logoDataUrl: null };
}

function renderGrid(overrides: Partial<Parameters<typeof FavoriteReposGrid>[0]> = {}) {
  return render(
    <FavoriteReposGrid
      repos={[repo("/code/alpha")]}
      total={1}
      loading={false}
      pending={null}
      filteredEmpty={false}
      onOpen={vi.fn()}
      onRemove={vi.fn()}
      onAdd={vi.fn()}
      {...overrides}
    />,
  );
}

describe("FavoriteReposGrid", () => {
  it("renders an optimistic pending card with the folder name while a repo is being added", () => {
    const { container } = renderGrid({ pending: "/code/incoming" });
    const card = container.querySelector("[data-pending-repo-card]");
    expect(card).not.toBeNull();
    expect(card).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("incoming")).toBeInTheDocument();
  });

  it("renders no pending card when idle", () => {
    const { container } = renderGrid({ pending: null });
    expect(container.querySelector("[data-pending-repo-card]")).toBeNull();
  });

  it("drops the pending card once the repo appears in the list (no duplicate)", () => {
    const { container } = renderGrid({
      repos: [repo("/code/alpha"), repo("/code/incoming")],
      total: 2,
      pending: "/code/incoming",
    });
    expect(container.querySelector("[data-pending-repo-card]")).toBeNull();
  });
});
