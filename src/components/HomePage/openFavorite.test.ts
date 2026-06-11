import { describe, expect, it } from "vitest";

import type { Project } from "@/types/dashboard.types";
import type { FavoriteRepo } from "@/types/user.types";

import { projectForFavorite, repoLabel } from "./openFavorite";

function repo(path: string, label: string | null = null): FavoriteRepo {
  return { path, label, addedAt: "2026-06-11T00:00:00Z" };
}

function project(path: string, name: string): Project {
  return {
    id: "scanned-id",
    name,
    path,
    claudeDir: `${path}/.claude`,
    hasAgents: true,
    hasSkills: false,
    hasSettings: true,
    agentCount: 5,
    skillCount: 0,
  };
}

describe("repoLabel", () => {
  it("uses the explicit label when present", () => {
    expect(repoLabel(repo("/code/alpha", "Alpha"))).toBe("Alpha");
  });

  it("falls back to the path basename", () => {
    expect(repoLabel(repo("/code/alpha"))).toBe("alpha");
  });
});

describe("projectForFavorite", () => {
  it("prefers a scanned project matched by path", () => {
    const scanned = [project("/code/alpha", "alpha")];
    expect(projectForFavorite(repo("/code/alpha"), scanned).id).toBe("scanned-id");
  });

  it("builds a minimal project when no scanned match exists", () => {
    const result = projectForFavorite(repo("/code/beta", "Beta"), []);
    expect(result.path).toBe("/code/beta");
    expect(result.name).toBe("Beta");
    expect(result.id.length).toBeGreaterThan(0);
  });
});
