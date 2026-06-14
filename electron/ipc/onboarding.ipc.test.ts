// @vitest-environment node
import type { IpcMainInvokeEvent } from "electron";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { Candidate, ScopeProfile } from "../types/onboarding.types";

// Capture handlers registered via `ipcMain.handle` (electron is unavailable in
// plain node/vitest), so the test can invoke each real handler directly.
type InvokeHandler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown;
const handlers = new Map<string, InvokeHandler>();

vi.mock("electron", () => ({
  ipcMain: {
    handle: (channel: string, handler: InvokeHandler) => {
      handlers.set(channel, handler);
    },
  },
}));

// Mock ONLY the service boundary so no fs scan / `claude` spawn / DB runs. The
// handlers must forward their args verbatim and return the service result.
const scanCandidatesMock = vi.fn<(root?: string) => Promise<Candidate[]>>();
vi.mock("../services/system/onboarding.service", () => ({
  scanCandidates: (root?: string) => scanCandidatesMock(root),
}));

const ingestScopeMock =
  vi.fn<(scopePath: string, scope: ScopeProfile["scope"], plugins: string[]) => Promise<ScopeProfile>>();
const getProfileMock = vi.fn<(scopePath: string) => ScopeProfile | null>();
const listProfilesMock = vi.fn<() => ScopeProfile[]>();
const refreshProfileMock = vi.fn<(scopePath: string) => Promise<ScopeProfile>>();
vi.mock("../services/profile/profile.service", () => ({
  ingestScope: (scopePath: string, scope: ScopeProfile["scope"], plugins: string[]) =>
    ingestScopeMock(scopePath, scope, plugins),
  getProfile: (scopePath: string) => getProfileMock(scopePath),
  listProfiles: () => listProfilesMock(),
  refreshProfile: (scopePath: string) => refreshProfileMock(scopePath),
}));

const { registerOnboardingHandlers } = await import("./onboarding.ipc");

const fakeEvent = {} as unknown as IpcMainInvokeEvent;

const candidate: Candidate = {
  path: "/repo",
  scope: "project",
  hasClaude: true,
  plugins: ["babysitter"],
};

const profile: ScopeProfile = {
  scopePath: "/repo",
  scope: "project",
  profileMd: "# profile",
  generatedAt: "2026-06-10T00:00:00.000Z",
};

beforeAll(() => {
  registerOnboardingHandlers();
});

beforeEach(() => {
  scanCandidatesMock.mockReset();
  ingestScopeMock.mockReset();
  getProfileMock.mockReset();
  listProfilesMock.mockReset();
  refreshProfileMock.mockReset();
});

describe("onboarding / profiles IPC", () => {
  it("registers all five channels", () => {
    expect(handlers.has("onboarding:scan")).toBe(true);
    expect(handlers.has("onboarding:ingest")).toBe(true);
    expect(handlers.has("profiles:list")).toBe(true);
    expect(handlers.has("profiles:get")).toBe(true);
    expect(handlers.has("profiles:refresh")).toBe(true);
  });

  it("onboarding:scan delegates to scanCandidates and returns Candidate[]", async () => {
    scanCandidatesMock.mockResolvedValue([candidate]);
    const result = await handlers.get("onboarding:scan")?.(fakeEvent);

    expect(scanCandidatesMock).toHaveBeenCalledWith(undefined);
    expect(result).toEqual([candidate]);
  });

  it("onboarding:scan forwards an explicit root", async () => {
    scanCandidatesMock.mockResolvedValue([]);
    await handlers.get("onboarding:scan")?.(fakeEvent, "/tmp/root");

    expect(scanCandidatesMock).toHaveBeenCalledWith("/tmp/root");
  });

  it("onboarding:ingest forwards (scopePath, scope, plugins) and returns the profile", async () => {
    ingestScopeMock.mockResolvedValue(profile);
    const result = await handlers.get("onboarding:ingest")?.(
      fakeEvent,
      "/repo",
      "project",
      ["babysitter"],
    );

    expect(ingestScopeMock).toHaveBeenCalledWith("/repo", "project", ["babysitter"]);
    expect(result).toEqual(profile);
  });

  it("profiles:list delegates to listProfiles and returns ScopeProfile[]", async () => {
    listProfilesMock.mockReturnValue([profile]);
    const result = await handlers.get("profiles:list")?.(fakeEvent);

    expect(listProfilesMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual([profile]);
  });

  it("profiles:get forwards the scopePath and returns the profile or null", async () => {
    getProfileMock.mockReturnValue(profile);
    const found = await handlers.get("profiles:get")?.(fakeEvent, "/repo");
    expect(getProfileMock).toHaveBeenCalledWith("/repo");
    expect(found).toEqual(profile);

    getProfileMock.mockReturnValue(null);
    const missing = await handlers.get("profiles:get")?.(fakeEvent, "/nope");
    expect(missing).toBeNull();
  });

  it("profiles:refresh forwards the scopePath and returns the refreshed profile", async () => {
    refreshProfileMock.mockResolvedValue(profile);
    const result = await handlers.get("profiles:refresh")?.(fakeEvent, "/repo");

    expect(refreshProfileMock).toHaveBeenCalledWith("/repo");
    expect(result).toEqual(profile);
  });
});
