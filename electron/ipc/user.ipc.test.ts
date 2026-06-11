// @vitest-environment node
import type { IpcMainInvokeEvent } from "electron";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { UserProfile, FavoriteRepo, RepoCandidate } from "../types";

type InvokeHandler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown;
const handlers = new Map<string, InvokeHandler>();

vi.mock("electron", () => ({
  ipcMain: {
    handle: (channel: string, handler: InvokeHandler) => {
      handlers.set(channel, handler);
    },
  },
}));

const locateClaudeUserMock = vi.fn<() => string | null>();
const fillUserProfileMock = vi.fn<(p: string) => Promise<UserProfile>>();
vi.mock("../services/user-search.service", () => ({
  locateClaudeUser: () => locateClaudeUserMock(),
  fillUserProfile: (p: string) => fillUserProfileMock(p),
}));

const getUserProfileMock = vi.fn<() => UserProfile | null>();
const saveUserProfileMock = vi.fn<(p: UserProfile) => UserProfile>();
const completeOnboardingMock = vi.fn<() => UserProfile>();
const resetUserMock = vi.fn<() => void>();
vi.mock("../services/user-profile.service", () => ({
  getUserProfile: () => getUserProfileMock(),
  saveUserProfile: (p: UserProfile) => saveUserProfileMock(p),
  completeOnboarding: () => completeOnboardingMock(),
  resetUser: () => resetUserMock(),
}));

const scanReposMock = vi.fn<(root?: string) => Promise<RepoCandidate[]>>();
vi.mock("../services/repos.service", () => ({
  scanRepos: (root?: string) => scanReposMock(root),
}));

const listMock = vi.fn<() => FavoriteRepo[]>();
const addMock = vi.fn<(path: string, label?: string) => FavoriteRepo>();
const removeMock = vi.fn<(path: string) => void>();
vi.mock("../services/favorite-repos.service", () => ({
  list: () => listMock(),
  add: (path: string, label?: string) => addMock(path, label),
  remove: (path: string) => removeMock(path),
}));

const { registerUserHandlers } = await import("./user.ipc");

const fakeEvent = {} as unknown as IpcMainInvokeEvent;

const profile: UserProfile = {
  claudeUserPath: "/home/me/.claude",
  name: null,
  role: null,
  plugins: [],
  capabilities: { agents: { count: 0, names: [] }, skills: 0, mcp: 0, hooks: 0 },
  summary: null,
  domains: [],
  workflow: null,
  onboardingCompletedAt: null,
  generatedAt: null,
  updatedAt: null,
};

const favorite: FavoriteRepo = { path: "/work/a", label: "A", addedAt: "2026-06-11T00:00:00.000Z" };

beforeAll(() => {
  registerUserHandlers();
});

beforeEach(() => {
  for (const m of [
    locateClaudeUserMock,
    fillUserProfileMock,
    getUserProfileMock,
    saveUserProfileMock,
    completeOnboardingMock,
    resetUserMock,
    scanReposMock,
    listMock,
    addMock,
    removeMock,
  ]) {
    m.mockReset();
  }
});

describe("user / repos / favoriteRepos IPC", () => {
  it("registers all channels", () => {
    for (const ch of [
      "user:locate",
      "user:buildProfile",
      "user:getProfile",
      "user:saveProfile",
      "user:complete",
      "user:reset",
      "repos:scan",
      "favoriteRepos:list",
      "favoriteRepos:add",
      "favoriteRepos:remove",
    ]) {
      expect(handlers.has(ch)).toBe(true);
    }
  });

  it("user:locate returns the located path or null", async () => {
    locateClaudeUserMock.mockReturnValue("/home/me/.claude");
    expect(await handlers.get("user:locate")?.(fakeEvent)).toBe("/home/me/.claude");
  });

  it("user:buildProfile forwards the path and returns the profile", async () => {
    fillUserProfileMock.mockResolvedValue(profile);
    const result = await handlers.get("user:buildProfile")?.(fakeEvent, "/home/me/.claude");
    expect(fillUserProfileMock).toHaveBeenCalledWith("/home/me/.claude");
    expect(result).toEqual(profile);
  });

  it("user:getProfile returns the profile or null", async () => {
    getUserProfileMock.mockReturnValue(null);
    expect(await handlers.get("user:getProfile")?.(fakeEvent)).toBeNull();
  });

  it("user:saveProfile forwards the profile", async () => {
    saveUserProfileMock.mockReturnValue(profile);
    const result = await handlers.get("user:saveProfile")?.(fakeEvent, profile);
    expect(saveUserProfileMock).toHaveBeenCalledWith(profile);
    expect(result).toEqual(profile);
  });

  it("user:complete delegates to completeOnboarding", async () => {
    completeOnboardingMock.mockReturnValue(profile);
    await handlers.get("user:complete")?.(fakeEvent);
    expect(completeOnboardingMock).toHaveBeenCalledTimes(1);
  });

  it("user:reset delegates to resetUser", async () => {
    await handlers.get("user:reset")?.(fakeEvent);
    expect(resetUserMock).toHaveBeenCalledTimes(1);
  });

  it("repos:scan forwards the root", async () => {
    scanReposMock.mockResolvedValue([]);
    await handlers.get("repos:scan")?.(fakeEvent, "/work");
    expect(scanReposMock).toHaveBeenCalledWith("/work");
  });

  it("favoriteRepos:list / add / remove delegate", async () => {
    listMock.mockReturnValue([favorite]);
    expect(await handlers.get("favoriteRepos:list")?.(fakeEvent)).toEqual([favorite]);

    addMock.mockReturnValue(favorite);
    await handlers.get("favoriteRepos:add")?.(fakeEvent, "/work/a", "A");
    expect(addMock).toHaveBeenCalledWith("/work/a", "A");

    await handlers.get("favoriteRepos:remove")?.(fakeEvent, "/work/a");
    expect(removeMock).toHaveBeenCalledWith("/work/a");
  });
});
