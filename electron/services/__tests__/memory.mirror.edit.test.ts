// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// Mock broadcast so writeMemoryFile's re-emit is observable and inert.
vi.mock("../core/broadcast", () => ({ broadcast: vi.fn() }));

import { broadcast } from "../core/broadcast";
import { readMemoryFile, writeMemoryFile } from "../memory/memory.mirror.edit";
import type { MemorySnapshot } from "../../types/memory-mirror.types";

const broadcastMock = vi.mocked(broadcast);

let tmpHome: string;
let prevHome: string | undefined;
let userClaudeDir: string;
let projDir: string;

beforeEach(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "cam-memedit-"));
  prevHome = process.env.HOME;
  process.env.HOME = tmpHome;
  userClaudeDir = path.join(tmpHome, ".claude");
  fs.mkdirSync(userClaudeDir, { recursive: true });
  projDir = fs.mkdtempSync(path.join(os.tmpdir(), "cam-memedit-proj-"));
  broadcastMock.mockClear();
});

afterEach(() => {
  process.env.HOME = prevHome;
  fs.rmSync(tmpHome, { recursive: true, force: true });
  fs.rmSync(projDir, { recursive: true, force: true });
});

function write(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

interface MemoryChangedPush {
  type?: string;
  snapshot?: MemorySnapshot;
}

describe("memory.mirror.edit readMemoryFile", () => {
  it("returns the full body of a mirror-member file", () => {
    const file = path.join(projDir, "CLAUDE.md");
    write(file, "# Project\n\nfull body here");
    expect(readMemoryFile(file, projDir)).toBe("# Project\n\nfull body here");
  });

  it("rejects a path that is not a member of the mirror", () => {
    write(path.join(projDir, "CLAUDE.md"), "# Project");
    const outsider = path.join(projDir, "secret.txt");
    write(outsider, "secret");
    expect(() => readMemoryFile(outsider, projDir)).toThrow(/not a memory file/);
  });

  it("rejects an absolute path outside the scope entirely", () => {
    write(path.join(projDir, "CLAUDE.md"), "# Project");
    const elsewhere = path.join(tmpHome, "etc-passwd");
    write(elsewhere, "root:x:0:0");
    expect(() => readMemoryFile(elsewhere, projDir)).toThrow(/not a memory file/);
  });
});

describe("memory.mirror.edit writeMemoryFile", () => {
  it("round-trips content and refreshes size + firstLine", () => {
    const file = path.join(projDir, "CLAUDE.md");
    write(file, "# old");

    const entry = writeMemoryFile(file, "# new title\nmore text", projDir);

    expect(fs.readFileSync(file, "utf-8")).toBe("# new title\nmore text");
    expect(entry.firstLine).toBe("# new title");
    expect(entry.size).toBe(Buffer.byteLength("# new title\nmore text"));
    expect(readMemoryFile(file, projDir)).toBe("# new title\nmore text");
  });

  it("re-emits a memory_changed push reflecting the new body", () => {
    const file = path.join(projDir, "CLAUDE.md");
    write(file, "# old");

    writeMemoryFile(file, "# fresh body", projDir);

    const pushes = broadcastMock.mock.calls
      .map(([d]) => d as MemoryChangedPush)
      .filter((d) => d.type === "memory_changed");
    expect(pushes.length).toBe(1);
    expect(
      pushes[0].snapshot?.entries.find((e) => e.path === file)?.firstLine,
    ).toBe("# fresh body");
  });

  it("rejects a non-member path and never creates a new file", () => {
    write(path.join(projDir, "CLAUDE.md"), "# Project");
    const newFile = path.join(projDir, "new.md");

    expect(() => writeMemoryFile(newFile, "should not exist", projDir)).toThrow(
      /not a memory file/,
    );
    expect(fs.existsSync(newFile)).toBe(false);
    expect(broadcastMock).not.toHaveBeenCalled();
  });

  it("leaves other memory files untouched", () => {
    const target = path.join(projDir, "CLAUDE.md");
    const other = path.join(projDir, "src", "CLAUDE.md");
    write(target, "# target old");
    write(other, "# other stable");

    writeMemoryFile(target, "# target new", projDir);

    expect(fs.readFileSync(other, "utf-8")).toBe("# other stable");
  });

  it("writes atomically — no stray .tmp files remain after a write", () => {
    const file = path.join(projDir, "CLAUDE.md");
    write(file, "# old");

    writeMemoryFile(file, "# new", projDir);

    const stray = fs.readdirSync(projDir).filter((n) => n.includes(".tmp"));
    expect(stray).toEqual([]);
  });

  it("validates against the user scope too (user-claude-md member)", () => {
    const userFile = path.join(userClaudeDir, "CLAUDE.md");
    write(userFile, "# user old");

    const entry = writeMemoryFile(userFile, "# user new", undefined);

    expect(entry.scope).toBe("user");
    expect(entry.source).toBe("user-claude-md");
    expect(fs.readFileSync(userFile, "utf-8")).toBe("# user new");
  });
});
