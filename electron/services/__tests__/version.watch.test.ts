// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import { promises as fsp } from "fs";
import os from "os";
import path from "path";

vi.mock("../core/broadcast", () => ({ broadcast: vi.fn() }));

import { broadcast } from "../core/broadcast";
import { unwatchAppVersion, watchAppVersion } from "../system/version.watch";

const broadcastMock = vi.mocked(broadcast);

let tmpDir: string;
let pkgPath: string;
let cwdSpy: ReturnType<typeof vi.spyOn>;

function writeVersion(version: string): Promise<void> {
  return fsp.writeFile(pkgPath, `${JSON.stringify({ name: "x", version }, null, 2)}\n`, "utf-8");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function versionEvents(): { type: string; version: string }[] {
  return broadcastMock.mock.calls
    .map((c) => c[0] as { type?: string; version?: string })
    .filter((d): d is { type: string; version: string } => d.type === "version_changed")
    .map((d) => ({ type: d.type, version: d.version }));
}

// Poll until `predicate` holds (5s ceiling), re-firing `onTick` each iteration to
// defeat fs.watch's startup race (a change in the first ms after watch() begins can
// be silently dropped on macOS). Re-writing the new version re-fires; the watcher's
// diff-guard means a same-version re-write never re-broadcasts.
async function waitFor(predicate: () => boolean, onTick?: () => Promise<void>): Promise<void> {
  for (let i = 0; i < 200 && !predicate(); i++) {
    await sleep(25);
    if (onTick) await onTick();
  }
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cam-version-"));
  pkgPath = path.join(tmpDir, "package.json");
  fs.writeFileSync(pkgPath, `${JSON.stringify({ name: "x", version: "1.0.0" }, null, 2)}\n`, "utf-8");
  cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
  broadcastMock.mockClear();
});

afterEach(() => {
  unwatchAppVersion();
  cwdSpy.mockRestore();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("watchAppVersion", () => {
  it("broadcasts version_changed once when the version bumps", async () => {
    await watchAppVersion();
    await writeVersion("1.0.1");

    await waitFor(
      () => versionEvents().some((e) => e.version === "1.0.1"),
      () => writeVersion("1.0.1"),
    );

    const events = versionEvents().filter((e) => e.version === "1.0.1");
    expect(events.length).toBe(1);
    expect(events[0]).toEqual({ type: "version_changed", version: "1.0.1" });
  });

  it("does NOT re-broadcast when the same version is written again (diff guard)", async () => {
    await watchAppVersion();
    await writeVersion("1.0.1");
    await waitFor(
      () => versionEvents().some((e) => e.version === "1.0.1"),
      () => writeVersion("1.0.1"),
    );
    // Let any in-flight watch events from the warm-up writes drain, then snapshot.
    await sleep(100);
    const after = versionEvents().length;

    // Several identical re-writes must not produce another version_changed.
    for (let i = 0; i < 5; i++) {
      await writeVersion("1.0.1");
      await sleep(20);
    }
    expect(versionEvents().length).toBe(after);
    // And every recorded event for this version is the single bump (diff-guarded).
    expect(versionEvents().filter((e) => e.version === "1.0.1").length).toBe(1);
  });

  it("unwatch stops further broadcasts", async () => {
    await watchAppVersion();
    unwatchAppVersion();
    broadcastMock.mockClear();

    await writeVersion("2.0.0");
    await sleep(200);

    expect(versionEvents()).toHaveLength(0);
  });
});
