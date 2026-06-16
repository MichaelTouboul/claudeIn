import { describe, expect, it } from "vitest";

import type { FavoriteRepo,Project  } from "@/lib/types";
import { projectForFavorite, repoLabel } from "@/lib/utils";

function repo(
  path: string,
  label: string | null = null,
  logoDataUrl: string | null = null,
): FavoriteRepo {
  return { path, label, addedAt: "2026-06-11T00:00:00Z", logoDataUrl };
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

  it("carries the favorite's persisted logo onto the built project", () => {
    const logo = "data:image/svg+xml;base64,PHN2Zz4=";
    const result = projectForFavorite(repo("/code/beta", "Beta", logo), []);
    expect(result.logoDataUrl).toBe(logo);
  });

  it("carries the favorite's logo onto a scanned-project match too", () => {
    const logo = "data:image/png;base64,AAAA";
    const scanned = [project("/code/alpha", "alpha")];
    const result = projectForFavorite(repo("/code/alpha", null, logo), scanned);
    expect(result.id).toBe("scanned-id");
    expect(result.logoDataUrl).toBe(logo);
  });

  it("defaults logoDataUrl to null when the favorite has none", () => {
    const result = projectForFavorite(repo("/code/gamma"), []);
    expect(result.logoDataUrl).toBeNull();
  });
});
