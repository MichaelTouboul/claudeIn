// @vitest-environment node
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// db.ts reads HOME at module load to compute the DB path, so set it before the
// dynamic imports below. The same HOME is the `user` settings layer scope.
const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "cam-hooks-"));
process.env.HOME = tmpHome;

// Mock broadcast so toggles don't need a BrowserWindow; we assert it's called.
vi.mock("../core/broadcast", () => ({ broadcast: vi.fn() }));

const { initDb, getDb } = await import("../core/db");
const { broadcast } = await import("../core/broadcast");
const { getHooks, setHookEnabled } = await import("../settings/hooks.service");
const { flattenLayerHooks, hookId } = await import("../settings/hooks.parse");

const broadcastMock = vi.mocked(broadcast);
const userSettingsPath = path.join(tmpHome, ".claude", "settings.json");

beforeAll(async () => {
  await initDb();
});

beforeEach(() => {
  fs.mkdirSync(path.join(tmpHome, ".claude"), { recursive: true });
  // Reset both the file and the disabled_hooks table between tests.
  try {
    fs.rmSync(userSettingsPath, { force: true });
  } catch {
    /* ignore */
  }
  getDb().exec("DELETE FROM disabled_hooks");
  broadcastMock.mockClear();
});

afterEach(() => {
  try {
    fs.rmSync(userSettingsPath, { force: true });
  } catch {
    /* ignore */
  }
});

function writeUser(settings: Record<string, unknown>): void {
  fs.writeFileSync(userSettingsPath, JSON.stringify(settings, null, 2));
}

function readUser(): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(userSettingsPath, "utf-8"));
}

const PRETOOL = {
  hooks: {
    PreToolUse: [
      {
        matcher: "Bash",
        hooks: [{ type: "command", command: "echo pre" }],
      },
    ],
  },
};

describe("hooks.parse flattenLayerHooks", () => {
  it("flattens leaves with stable ids and null matcher when absent", () => {
    const entries = flattenLayerHooks({
      source: "user",
      path: "/x/settings.json",
      exists: true,
      data: {
        hooks: {
          Stop: [{ hooks: [{ type: "command", command: "say done" }] }],
        },
      },
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      event: "Stop",
      matcher: null,
      command: "say done",
      source: "user",
      enabled: true,
      editable: true,
    });
    expect(entries[0].id).toBe(hookId("user", "Stop", null, "say done"));
  });

  it("marks managed-layer hooks as non-editable", () => {
    const entries = flattenLayerHooks({
      source: "managed",
      path: "/m/settings.json",
      exists: true,
      data: PRETOOL,
    });
    expect(entries[0].editable).toBe(false);
  });

  it("ignores non-command leaves and malformed shapes", () => {
    const entries = flattenLayerHooks({
      source: "user",
      path: "/x/settings.json",
      exists: true,
      data: {
        hooks: {
          PreToolUse: [
            { matcher: "Bash", hooks: [{ type: "other", command: "x" }] },
            "garbage",
            { hooks: "not-an-array" },
          ],
        },
      },
    });
    expect(entries).toHaveLength(0);
  });
});

describe("getHooks", () => {
  it("returns normalized live entries from the user layer", () => {
    writeUser(PRETOOL);
    const hooks = getHooks();
    expect(hooks).toHaveLength(1);
    expect(hooks[0]).toMatchObject({
      event: "PreToolUse",
      matcher: "Bash",
      command: "echo pre",
      source: "user",
      enabled: true,
      editable: true,
    });
  });
});

describe("setHookEnabled — disable", () => {
  it("removes the exact leaf, prunes emptied parents, and records it", () => {
    writeUser(PRETOOL);
    const [hook] = getHooks();

    const result = setHookEnabled(hook.id, false);

    // File no longer carries the hook (whole `hooks` key pruned away).
    expect(readUser().hooks).toBeUndefined();
    // Recorded in disabled_hooks.
    const rows = getDb().prepare("SELECT * FROM disabled_hooks").all();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: hook.id,
      event: "PreToolUse",
      matcher: "Bash",
      command: "echo pre",
    });
    // Still surfaced, now disabled.
    const disabled = result.find((h) => h.id === hook.id);
    expect(disabled?.enabled).toBe(false);
    expect(broadcastMock).toHaveBeenCalled();
  });

  it("preserves OTHER settings keys and sibling hooks", () => {
    writeUser({
      model: "opus",
      env: { FOO: "bar" },
      hooks: {
        PreToolUse: [
          {
            matcher: "Bash",
            hooks: [
              { type: "command", command: "echo pre" },
              { type: "command", command: "keep me" },
            ],
          },
        ],
        Stop: [{ hooks: [{ type: "command", command: "stop hook" }] }],
      },
    });
    const target = getHooks().find((h) => h.command === "echo pre");

    setHookEnabled(target!.id, false);

    const after = readUser();
    expect(after.model).toBe("opus");
    expect(after.env).toEqual({ FOO: "bar" });
    // The sibling command in the same group survives.
    const hooksAfter = after.hooks as Record<string, unknown[]>;
    const pre = hooksAfter.PreToolUse[0] as { hooks: { command: string }[] };
    expect(pre.hooks.map((h) => h.command)).toEqual(["keep me"]);
    // The unrelated Stop event is untouched.
    expect(hooksAfter.Stop).toBeDefined();
  });

  it("is idempotent: a second disable is a safe no-op", () => {
    writeUser(PRETOOL);
    const [hook] = getHooks();

    setHookEnabled(hook.id, false);
    const result = setHookEnabled(hook.id, false);

    const rows = getDb().prepare("SELECT * FROM disabled_hooks").all();
    expect(rows).toHaveLength(1);
    expect(result.find((h) => h.id === hook.id)?.enabled).toBe(false);
  });
});

describe("setHookEnabled — enable (restore)", () => {
  it("re-inserts the exact hook and forgets the disabled row", () => {
    writeUser(PRETOOL);
    const [hook] = getHooks();

    setHookEnabled(hook.id, false);
    const result = setHookEnabled(hook.id, true);

    // Restored to the file, same event/matcher/command.
    const restored = readUser().hooks as Record<string, unknown[]>;
    const group = restored.PreToolUse[0] as {
      matcher: string;
      hooks: { type: string; command: string }[];
    };
    expect(group.matcher).toBe("Bash");
    expect(group.hooks).toEqual([{ type: "command", command: "echo pre" }]);
    // Row removed.
    expect(getDb().prepare("SELECT * FROM disabled_hooks").all()).toHaveLength(0);
    // Live + enabled again, same stable id.
    const live = result.find((h) => h.id === hook.id);
    expect(live).toMatchObject({ enabled: true, command: "echo pre" });
  });

  it("round-trips: disable→enable leaves an equivalent hook list", () => {
    writeUser(PRETOOL);
    const before = getHooks();

    const [hook] = before;
    setHookEnabled(hook.id, false);
    const after = setHookEnabled(hook.id, true);

    expect(after.map((h) => ({ ...h, sourcePath: "" }))).toEqual(
      before.map((h) => ({ ...h, sourcePath: "" })),
    );
  });
});

describe("setHookEnabled — managed layer is read-only", () => {
  it("throws rather than writing a managed hook (disable)", () => {
    // Synthesize a managed-scope disabled candidate by recording it directly:
    // disabling reads getHooks() which won't list managed as editable, so we
    // assert the editable:false guard via a crafted entry through the store path.
    const id = hookId("managed", "PreToolUse", "Bash", "echo pre");
    getDb()
      .prepare(
        `INSERT INTO disabled_hooks (id, scope, event, matcher, command, layer_path, removed_at)
         VALUES (?, 'managed', 'PreToolUse', 'Bash', 'echo pre', '/managed.json', ?)`,
      )
      .run(id, new Date().toISOString());

    expect(() => setHookEnabled(id, true)).toThrow(/managed/i);
  });
});
