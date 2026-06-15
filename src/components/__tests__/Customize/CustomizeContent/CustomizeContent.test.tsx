import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UseMcpManage } from "@/components/Customize/Connectors/useMcpManage";
import { CustomizeContent } from "@/components/Customize/CustomizeContent/CustomizeContent";
import type { UserProfile } from "@/lib/types";
import { CustomizeSection, useCustomizeStore } from "@/store/customize/useCustomizeStore";

function makeProfile(): UserProfile {
  return {
    claudeUserPath: "/home/u/.claude",
    name: "Ada",
    role: "Engineer",
    plugins: [],
    capabilities: { agents: { count: 0, names: [] }, skills: 0, mcp: 0, hooks: 0 },
    domains: ["backend"],
    onboardingCompletedAt: "x",
    generatedAt: null,
    updatedAt: null,
  };
}

const manage = {
  getRaw: vi.fn(),
  edit: vi.fn(),
  remove: vi.fn(),
} as unknown as UseMcpManage;

beforeEach(() => {
  useCustomizeStore.getState().reset();
  window.api = { getUserProfile: vi.fn().mockResolvedValue(makeProfile()) } as unknown as Window["api"];
});

describe("CustomizeContent", () => {
  it("renders the profile pane by default (Profile is the initial section)", async () => {
    expect(useCustomizeStore.getState().section).toBe(CustomizeSection.Profile);
    render(<CustomizeContent manage={manage} />);
    await waitFor(() => {
      expect(screen.getByRole("region", { name: /profile/i })).toBeInTheDocument();
    });
    expect(screen.getByText("Ada")).toBeInTheDocument();
  });
});
