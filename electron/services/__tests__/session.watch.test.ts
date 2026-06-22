// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

vi.mock("electron", () => ({ BrowserWindow: { getAllWindows: () => [] } }));

// session.watch keys its live caches (fileOffsets, sessionAgentCache,
// fileResolvedModel, and the per-project resolved-model fallback) by the encoded
// sessions dir / filePath. `stopWatching(projectPath)` must evict ONLY the keys
// that belong to that exact project — not those of sibling projects whose
// encoded dir merely shares a prefix (e.g. `…-tastewise` vs
// `…-tastewise-teams-*`). The base derives from HOME (getProjectsBase).
let tmpHome: string;
let prevHome: string | undefined;

beforeEach(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "cam-watch-"));
  prevHome = process.env.HOME;
  process.env.HOME = tmpHome;
});

afterEach(() => {
  process.env.HOME = prevHome;
  fs.rmSync(tmpHome, { recursive: true, force: true });
});

function sessionsDirFor(projectPath: string): string {
  const encoded = projectPath.replace(/\//g, "-");
  return path.join(tmpHome, ".claude", "projects", encoded);
}

function seedSession(projectPath: string, id: string): void {
  const dir = sessionsDirFor(projectPath);
  fs.mkdirSync(dir, { recursive: true });
  const line = JSON.stringify({ type: "user", promptId: "p", message: { content: "hi" } });
  fs.writeFileSync(path.join(dir, `${id}.jsonl`), line + "\n", "utf-8");
}

describe("stopWatching — sibling-project prefix boundary", () => {
  it("does NOT evict caches of a sibling project whose dir shares the prefix", async () => {
    const watch = await import("../session/session.watch?fresh=stop-boundary");
    const sibling = "/Users/x/repos/tastewise-teams-app";
    const target = "/Users/x/repos/tastewise";

    seedSession(sibling, "s1");
    seedSession(target, "t1");

    watch.startWatching(sibling);
    watch.startWatching(target);

    const siblingDir = sessionsDirFor(sibling);
    const targetDir = sessionsDirFor(target);
    const sep = path.sep;
    // A key belongs to a dir only when it is the dir or strictly under it —
    // mirrors the boundary the fix uses (and excludes prefix-sharing siblings).
    const under = (key: string, dir: string): boolean => key === dir || key.startsWith(dir + sep);

    const keys = (): string[] => watch.__peekOffsetKeys() as string[];

    // Both dirs have populated offset caches after startWatching.
    expect(keys().some((k) => under(k, siblingDir))).toBe(true);
    expect(keys().some((k) => under(k, targetDir))).toBe(true);

    // Stopping the SHORTER-named project must not wipe the sibling's caches.
    watch.stopWatching(target);

    expect(keys().some((k) => under(k, targetDir))).toBe(false);
    expect(keys().some((k) => under(k, siblingDir))).toBe(true);

    watch.stopWatching(sibling);
  });
});
