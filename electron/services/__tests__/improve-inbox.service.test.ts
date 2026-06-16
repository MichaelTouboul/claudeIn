// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import { promises as fsp } from "fs";
import os from "os";
import path from "path";

vi.mock("../core/broadcast", () => ({ broadcast: vi.fn() }));

import { broadcast } from "../core/broadcast";
import {
  getRequest,
  listRequests,
  submitRequest,
  unwatchInbox,
  updateStatus,
  watchInbox,
} from "../improve/improve-inbox.service";
import { getInboxDir } from "../improve/improve-inbox.io";
import { ImproveStatus, ImproveType, type ImproveRequest } from "../../types/improve.types";

const broadcastMock = vi.mocked(broadcast);

let prevHome: string | undefined;
let tmpHome: string;

const baseInput = {
  type: ImproveType.Feature,
  title: "Add dark mode toggle",
  description: "Users want a dark mode toggle in the header.",
  acceptance: ["toggle appears in header", "persists across reloads"],
};

beforeEach(() => {
  prevHome = process.env.HOME;
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "cam-improve-"));
  process.env.HOME = tmpHome;
  broadcastMock.mockClear();
});

afterEach(() => {
  unwatchInbox();
  process.env.HOME = prevHome;
  fs.rmSync(tmpHome, { recursive: true, force: true });
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("submitRequest", () => {
  it("writes a parseable pending JSON file with minted id + createdAt", async () => {
    const req = await submitRequest(baseInput);

    expect(req.id).toBeTruthy();
    expect(req.status).toBe(ImproveStatus.Pending);
    expect(req.transcript).toEqual([]);
    expect(() => new Date(req.createdAt).toISOString()).not.toThrow();

    const file = path.join(getInboxDir(), `${req.id}.json`);
    const onDisk = JSON.parse(await fsp.readFile(file, "utf-8")) as ImproveRequest;
    expect(onDisk).toMatchObject({
      id: req.id,
      status: ImproveStatus.Pending,
      title: baseInput.title,
      acceptance: baseInput.acceptance,
    });
  });

  it("creates the inbox dir if it is missing", async () => {
    expect(fs.existsSync(getInboxDir())).toBe(false);
    await submitRequest(baseInput);
    expect(fs.existsSync(getInboxDir())).toBe(true);
  });

  it("preserves an attached transcript", async () => {
    const transcript = [{ role: "user", text: "please add it" }];
    const req = await submitRequest({ ...baseInput, transcript });
    expect(req.transcript).toEqual(transcript);
  });
});

describe("listRequests", () => {
  it("returns all requests sorted by createdAt descending", async () => {
    const a = await submitRequest({ ...baseInput, title: "first" });
    await sleep(5);
    const b = await submitRequest({ ...baseInput, title: "second" });

    const list = await listRequests();
    expect(list.map((r) => r.id)).toEqual([b.id, a.id]);
  });

  it("returns an empty array when the inbox dir does not exist", async () => {
    expect(await listRequests()).toEqual([]);
  });
});

describe("getRequest", () => {
  it("returns the request by id and null for unknown ids", async () => {
    const req = await submitRequest(baseInput);
    expect(await getRequest(req.id)).toMatchObject({ id: req.id });
    expect(await getRequest("does-not-exist")).toBeNull();
  });
});

describe("updateStatus", () => {
  it("merges the patch and persists it to disk", async () => {
    const req = await submitRequest(baseInput);

    const updated = await updateStatus(req.id, {
      status: ImproveStatus.Merged,
      commit: "abc123",
      summary: "shipped the toggle",
    });

    expect(updated).toMatchObject({
      id: req.id,
      status: ImproveStatus.Merged,
      commit: "abc123",
      summary: "shipped the toggle",
      title: baseInput.title, // untouched fields preserved
    });

    const reread = await getRequest(req.id);
    expect(reread?.status).toBe(ImproveStatus.Merged);
    expect(reread?.commit).toBe("abc123");
  });

  it("persists a version written alongside a merge", async () => {
    const req = await submitRequest(baseInput);

    const merged = await updateStatus(req.id, {
      status: ImproveStatus.Merged,
      commit: "abc123",
      summary: "shipped the toggle",
      version: "0.2.0",
    });
    expect(merged?.version).toBe("0.2.0");

    const reread = await getRequest(req.id);
    expect(reread?.version).toBe("0.2.0");
    expect(reread?.status).toBe(ImproveStatus.Merged);
  });

  it("records a failure reason", async () => {
    const req = await submitRequest(baseInput);
    const updated = await updateStatus(req.id, {
      status: ImproveStatus.Failed,
      failureReason: "gate did not pass",
    });
    expect(updated?.status).toBe(ImproveStatus.Failed);
    expect(updated?.failureReason).toBe("gate did not pass");
  });

  it("returns null for an unknown id", async () => {
    expect(await updateStatus("nope", { status: ImproveStatus.Merged })).toBeNull();
  });

  it("persists a pending → in_progress → merged sequence", async () => {
    const req = await submitRequest(baseInput);

    const claimed = await updateStatus(req.id, {
      status: ImproveStatus.InProgress,
      claimedAt: "2026-06-11T12:00:00.000Z",
    });
    expect(claimed?.status).toBe(ImproveStatus.InProgress);
    expect(claimed?.claimedAt).toBe("2026-06-11T12:00:00.000Z");

    const afterClaim = await getRequest(req.id);
    expect(afterClaim?.status).toBe(ImproveStatus.InProgress);
    expect(afterClaim?.claimedAt).toBe("2026-06-11T12:00:00.000Z");

    const merged = await updateStatus(req.id, {
      status: ImproveStatus.Merged,
      commit: "abc123",
      summary: "shipped it",
    });
    expect(merged?.status).toBe(ImproveStatus.Merged);
    expect(merged?.claimedAt).toBe("2026-06-11T12:00:00.000Z"); // preserved across patch

    const reread = await getRequest(req.id);
    expect(reread?.status).toBe(ImproveStatus.Merged);
    expect(reread?.commit).toBe("abc123");
  });

  it("keeps listRequests sorted by createdAt descending after an in_progress claim", async () => {
    const a = await submitRequest({ ...baseInput, title: "first" });
    await sleep(5);
    const b = await submitRequest({ ...baseInput, title: "second" });

    await updateStatus(a.id, {
      status: ImproveStatus.InProgress,
      claimedAt: new Date().toISOString(),
    });

    const list = await listRequests();
    expect(list.map((r) => r.id)).toEqual([b.id, a.id]);
  });
});

function changeEvents(): { type: string; request: ImproveRequest }[] {
  return broadcastMock.mock.calls
    .map((c) => c[0] as { type?: string; request?: ImproveRequest })
    .filter((d): d is { type: string; request: ImproveRequest } => d.type === "improve_request_changed")
    .map((d) => ({ type: d.type, request: d.request }));
}

// Poll until `predicate` holds (5s ceiling). `onTick` re-fires each iteration to
// defeat fs.watch's startup race: on macOS a change that lands in the first few ms
// after fs.watch() begins is silently dropped (not delayed), so a one-shot write is
// occasionally never seen. Re-writing the same file each tick guarantees the warm
// watcher eventually catches one (the watcher has no diff-guard, so a same-content
// re-write still broadcasts). Exits as soon as the predicate holds — no slowdown.
async function waitFor(predicate: () => boolean, onTick?: () => Promise<void>): Promise<void> {
  for (let i = 0; i < 200 && !predicate(); i++) {
    await sleep(25);
    if (onTick) await onTick();
  }
}

describe("watchInbox", () => {
  it("broadcasts improve_request_changed on add", async () => {
    await watchInbox();
    const req = await submitRequest(baseInput);

    await waitFor(
      () => changeEvents().some((e) => e.request.id === req.id),
      async () => void (await updateStatus(req.id, {})), // re-write same content to re-fire
    );

    const event = changeEvents().find((e) => e.request.id === req.id);
    expect(event).toBeDefined();
    expect(event?.request.status).toBe(ImproveStatus.Pending);
  });

  it("broadcasts on change (status update)", async () => {
    const req = await submitRequest(baseInput);
    await watchInbox();
    broadcastMock.mockClear();

    await updateStatus(req.id, { status: ImproveStatus.Merged, commit: "c1" });

    await waitFor(
      () =>
        changeEvents().some(
          (e) => e.request.id === req.id && e.request.status === ImproveStatus.Merged,
        ),
      async () => void (await updateStatus(req.id, { status: ImproveStatus.Merged, commit: "c1" })),
    );

    const merged = changeEvents().find(
      (e) => e.request.id === req.id && e.request.status === ImproveStatus.Merged,
    );
    expect(merged).toBeDefined();
  });
});
