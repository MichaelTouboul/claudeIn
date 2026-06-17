# Repo Diff Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A read-only git-diff viewer for the selected project, shown as a new UtilityPanel "Diff" tab with a Working-tree⇄Branch toggle, opened from a Header "Changes" button, reusing DiffBlock rendering + per-line Ask Claude.

**Architecture:** Backend (`electron/services/git/`) shells out to read-only `git`, a hand-rolled unified-diff parser produces a git-native `RepoDiff`, exposed via the `git:diff` IPC. The renderer adds a `PanelTabKind.Diff`, maps `RepoFileDiff` → the existing `FileDiff`, and renders each file with `DiffBlock`. Zero new dependencies.

**Tech Stack:** Electron main (Node `child_process`), React 19 renderer, zustand, vitest. Spec: `docs/superpowers/specs/2026-06-17-repo-diff-viewer-design.md`.

**Conventions (apply to every task):** no `any`; named imports only; `@/` alias; 300-line hard limit per file; 0 ESLint errors AND warnings; `npm run typecheck` + `typecheck:electron` clean; finite state as `as const` enum + value→behavior map (no fallback chains). Run `npm test` for the touched area after each task. Final landing via `.claude/hooks/land.sh <branch>` (`feat:` → minor).

---

## File structure

**Create (backend):**
- `electron/types/git.types.ts` — `DiffMode`, `FileStatus`, `GitLineKind`, `GitDiffLine`, `GitDiffHunk`, `RepoFileDiff`, `RepoDiff`.
- `electron/services/git/git.parse.ts` — pure unified-diff → `RepoFileDiff[]` parser (node-free).
- `electron/services/git/git.service.ts` — read-only git runner (`isGitRepo`, `getWorkingDiff`, `getBranchDiff`, `loadRepoDiff`).
- `electron/ipc/git.ipc.ts` — `git:diff` handler.

**Create (renderer):**
- `src/components/Dashboard/Workspace/DashboardArea/Dashboard/UtilityPanel/DiffTab/DiffTab.tsx` — the panel body.
- `src/components/Dashboard/Workspace/DashboardArea/Dashboard/UtilityPanel/DiffTab/repoDiffToFileDiff.ts` — `RepoFileDiff` → `FileDiff` mapper.
- `src/components/Dashboard/Workspace/DashboardArea/Dashboard/UtilityPanel/DiffTab/DiffModeToggle/DiffModeToggle.tsx` — Working⇄Branch toggle (kept separate to respect the 300-line limit).

**Create (tests):**
- `electron/services/__tests__/git.parse.test.ts`
- `electron/services/__tests__/git.service.test.ts`
- `src/components/__tests__/Dashboard/.../UtilityPanel/DiffTab/repoDiffToFileDiff.test.ts`
- `src/components/__tests__/Dashboard/.../UtilityPanel/DiffTab/DiffTab.test.tsx`

**Modify:**
- `electron/ipc/index.ts` — register the git ipc.
- `electron/preload.ts` — expose `window.api.gitDiff`.
- `src/env.d.ts` — type `gitDiff` + re-export git types.
- `src/components/Dashboard/ResponseBody/blocks/DiffBlock/diff.types.ts` — add `LineKind.Hunk`.
- `src/components/Dashboard/ResponseBody/blocks/DiffBlock/DiffLineRow/DiffLineRow.tsx` + `lineStyle.ts` — render the `hunk` kind (no line numbers, no ask button).
- `src/store/dashboard/usePanelStore.ts` — `PanelTabKind.Diff`, `DiffPayload`, union member, `diffTabId`.
- `src/components/Dashboard/Workspace/DashboardArea/Dashboard/DashboardSurface/...` — the `TAB_BODY` map: `Diff → DiffTab`.
- `src/components/Dashboard/Header/Header.tsx` — "Changes" button.

---

## Task 1: Shared git types

**Files:**
- Create: `electron/types/git.types.ts`

- [ ] **Step 1: Write the types**

```ts
/** Which diff scope to compute for a repo. */
export const DiffMode = { Working: "working", Branch: "branch" } as const;
export type DiffMode = (typeof DiffMode)[keyof typeof DiffMode];

/** A changed file's status in a diff. */
export const FileStatus = {
  Added: "added",
  Modified: "modified",
  Deleted: "deleted",
  Renamed: "renamed",
  Binary: "binary",
} as const;
export type FileStatus = (typeof FileStatus)[keyof typeof FileStatus];

/** A single line's role inside a hunk. `hunk` is the `@@ … @@` separator row. */
export const GitLineKind = {
  Add: "add",
  Del: "del",
  Context: "context",
  Hunk: "hunk",
} as const;
export type GitLineKind = (typeof GitLineKind)[keyof typeof GitLineKind];

export interface GitDiffLine {
  kind: GitLineKind;
  text: string;
  oldLine: number | null;
  newLine: number | null;
}

export interface GitDiffHunk {
  header: string;
  lines: GitDiffLine[];
}

export interface RepoFileDiff {
  path: string;
  oldPath?: string;
  status: FileStatus;
  additions: number;
  deletions: number;
  binary: boolean;
  hunks: GitDiffHunk[];
}

export interface RepoDiff {
  mode: DiffMode;
  base?: string;
  files: RepoFileDiff[];
  truncated: boolean;
  error?: string;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run typecheck:electron`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add electron/types/git.types.ts
git commit -m "feat(git): shared RepoDiff types"
```

---

## Task 2: Hand-rolled unified-diff parser

**Files:**
- Create: `electron/services/git/git.parse.ts`
- Test: `electron/services/__tests__/git.parse.test.ts`

The parser consumes the output of `git diff` (one or more `diff --git` sections) and returns `RepoFileDiff[]`. It is pure (no Node imports) and bounded.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { parseUnifiedDiff } from "../git/git.parse";
import { FileStatus, GitLineKind } from "../../types/git.types";

const MODIFY = `diff --git a/src/a.ts b/src/a.ts
index 111..222 100644
--- a/src/a.ts
+++ b/src/a.ts
@@ -1,3 +1,3 @@
 context one
-old line
+new line
 context two
`;

describe("parseUnifiedDiff", () => {
  it("parses a modified file with adds/dels/context and line numbers", () => {
    const [f] = parseUnifiedDiff(MODIFY).files;
    expect(f.path).toBe("src/a.ts");
    expect(f.status).toBe(FileStatus.Modified);
    expect(f.additions).toBe(1);
    expect(f.deletions).toBe(1);
    expect(f.hunks).toHaveLength(1);
    const kinds = f.hunks[0].lines.map((l) => l.kind);
    expect(kinds).toEqual([
      GitLineKind.Hunk,
      GitLineKind.Context,
      GitLineKind.Del,
      GitLineKind.Add,
      GitLineKind.Context,
    ]);
    const add = f.hunks[0].lines.find((l) => l.kind === GitLineKind.Add)!;
    expect(add.newLine).toBe(2);
    expect(add.oldLine).toBeNull();
  });

  it("marks an added file (/dev/null source)", () => {
    const src = `diff --git a/new.txt b/new.txt
new file mode 100644
index 000..abc
--- /dev/null
+++ b/new.txt
@@ -0,0 +1,2 @@
+hello
+world
`;
    const [f] = parseUnifiedDiff(src).files;
    expect(f.status).toBe(FileStatus.Added);
    expect(f.additions).toBe(2);
  });

  it("marks a deleted file", () => {
    const src = `diff --git a/gone.txt b/gone.txt
deleted file mode 100644
index abc..000
--- a/gone.txt
+++ /dev/null
@@ -1,1 +0,0 @@
-bye
`;
    expect(parseUnifiedDiff(src).files[0].status).toBe(FileStatus.Deleted);
  });

  it("marks a rename with oldPath", () => {
    const src = `diff --git a/old.ts b/new.ts
similarity index 100%
rename from old.ts
rename to new.ts
`;
    const [f] = parseUnifiedDiff(src).files;
    expect(f.status).toBe(FileStatus.Renamed);
    expect(f.oldPath).toBe("old.ts");
    expect(f.path).toBe("new.ts");
  });

  it("marks a binary file with no hunks", () => {
    const src = `diff --git a/img.png b/img.png
index abc..def 100644
Binary files a/img.png and b/img.png differ
`;
    const [f] = parseUnifiedDiff(src).files;
    expect(f.binary).toBe(true);
    expect(f.status).toBe(FileStatus.Binary);
    expect(f.hunks).toEqual([]);
  });

  it("ignores the \\ No newline at end of file marker", () => {
    const src = `diff --git a/a b/a
--- a/a
+++ b/a
@@ -1 +1 @@
-x
\\ No newline at end of file
+y
\\ No newline at end of file
`;
    const lines = parseUnifiedDiff(src).files[0].hunks[0].lines;
    expect(lines.some((l) => l.text.includes("No newline"))).toBe(false);
  });

  it("parses multiple files and multiple hunks", () => {
    const r = parseUnifiedDiff(MODIFY + MODIFY.replace(/a\.ts/g, "b.ts"));
    expect(r.files.map((f) => f.path)).toEqual(["src/a.ts", "src/b.ts"]);
  });

  it("truncates past the file cap", () => {
    const many = Array.from({ length: 600 }, (_, i) =>
      MODIFY.replace(/a\.ts/g, `f${i}.ts`),
    ).join("");
    const r = parseUnifiedDiff(many, { maxFiles: 500 });
    expect(r.files.length).toBe(500);
    expect(r.truncated).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run electron/services/__tests__/git.parse.test.ts`
Expected: FAIL — `parseUnifiedDiff` not found.

- [ ] **Step 3: Implement the parser**

```ts
import {
  FileStatus,
  GitDiffHunk,
  GitDiffLine,
  GitLineKind,
  RepoFileDiff,
} from "../../types/git.types";

export interface ParseResult {
  files: RepoFileDiff[];
  truncated: boolean;
}
export interface ParseOptions {
  maxFiles?: number;
  maxLinesPerFile?: number;
}

const HUNK_RE = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

/** Split raw `git diff` output into per-file sections at each `diff --git` line. */
function splitFiles(diff: string): string[] {
  const lines = diff.split("\n");
  const sections: string[] = [];
  let cur: string[] | null = null;
  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      if (cur) sections.push(cur.join("\n"));
      cur = [line];
    } else if (cur) {
      cur.push(line);
    }
  }
  if (cur) sections.push(cur.join("\n"));
  return sections;
}

function pathsFromHeader(section: string): { oldPath: string; path: string } {
  // `diff --git a/<old> b/<new>` — strip the a/ and b/ prefixes.
  const m = section.match(/^diff --git a\/(.+?) b\/(.+)$/m);
  if (m) return { oldPath: m[1], path: m[2] };
  return { oldPath: "", path: "" };
}

function parseSection(section: string, maxLines: number): RepoFileDiff {
  const lines = section.split("\n");
  let { oldPath, path } = pathsFromHeader(section);
  let status: FileStatus = FileStatus.Modified;
  let binary = false;
  let additions = 0;
  let deletions = 0;
  const hunks: GitDiffHunk[] = [];
  let cur: GitDiffHunk | null = null;
  let oldNo = 0;
  let newNo = 0;
  let emitted = 0;

  for (const line of lines) {
    if (line.startsWith("new file mode")) status = FileStatus.Added;
    else if (line.startsWith("deleted file mode")) status = FileStatus.Deleted;
    else if (line.startsWith("rename from ")) {
      status = FileStatus.Renamed;
      oldPath = line.slice("rename from ".length);
    } else if (line.startsWith("rename to ")) {
      status = FileStatus.Renamed;
      path = line.slice("rename to ".length);
    } else if (line.startsWith("Binary files")) {
      binary = true;
      status = FileStatus.Binary;
    } else if (line.startsWith("--- ") || line.startsWith("+++ ") || line.startsWith("index ")) {
      continue; // file headers — paths already taken from `diff --git`
    } else {
      const h = line.match(HUNK_RE);
      if (h) {
        oldNo = Number(h[1]);
        newNo = Number(h[2]);
        cur = { header: line, lines: [{ kind: GitLineKind.Hunk, text: line, oldLine: null, newLine: null }] };
        hunks.push(cur);
      } else if (cur && emitted < maxLines) {
        if (line.startsWith("\\")) continue; // "\ No newline at end of file"
        const body: GitDiffLine | null = toBodyLine(line, oldNo, newNo);
        if (!body) continue;
        if (body.kind === GitLineKind.Add) { newNo++; additions++; }
        else if (body.kind === GitLineKind.Del) { oldNo++; deletions++; }
        else { oldNo++; newNo++; }
        cur.lines.push(body);
        emitted++;
      }
    }
  }
  return { path, oldPath: oldPath && oldPath !== path ? oldPath : undefined, status, additions, deletions, binary, hunks };
}

function toBodyLine(line: string, oldNo: number, newNo: number): GitDiffLine | null {
  const c = line[0];
  const text = line.slice(1);
  if (c === "+") return { kind: GitLineKind.Add, text, oldLine: null, newLine: newNo };
  if (c === "-") return { kind: GitLineKind.Del, text, oldLine: oldNo, newLine: null };
  if (c === " ") return { kind: GitLineKind.Context, text, oldLine: oldNo, newLine: newNo };
  return null; // blank trailing lines etc.
}

export function parseUnifiedDiff(diff: string, opts: ParseOptions = {}): ParseResult {
  const maxFiles = opts.maxFiles ?? 500;
  const maxLines = opts.maxLinesPerFile ?? 4000;
  const sections = splitFiles(diff);
  const capped = sections.slice(0, maxFiles);
  const files = capped.map((s) => parseSection(s, maxLines));
  return { files, truncated: sections.length > capped.length };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run electron/services/__tests__/git.parse.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Lint + commit**

```bash
npm run lint
git add electron/services/git/git.parse.ts electron/services/__tests__/git.parse.test.ts
git commit -m "feat(git): hand-rolled unified-diff parser"
```

---

## Task 3: Read-only git service

**Files:**
- Create: `electron/services/git/git.service.ts`
- Test: `electron/services/__tests__/git.service.test.ts`

Spawns read-only `git` with a timeout, assembles `RepoDiff`. Untracked files (working mode) are read from disk and synthesized as added `RepoFileDiff`s.

- [ ] **Step 1: Write failing tests (temp-repo fixture)**

```ts
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadRepoDiff } from "../git/git.service";
import { DiffMode, FileStatus } from "../../types/git.types";

let repo: string;
const git = (args: string[]) => execFileSync("git", args, { cwd: repo });

beforeAll(() => {
  repo = fs.mkdtempSync(path.join(os.tmpdir(), "diffrepo-"));
  git(["init", "-q"]);
  git(["config", "user.email", "t@t.t"]);
  git(["config", "user.name", "t"]);
  fs.writeFileSync(path.join(repo, "a.txt"), "one\ntwo\n");
  git(["add", "."]);
  git(["commit", "-qm", "init"]);
  fs.writeFileSync(path.join(repo, "a.txt"), "one\nTWO\n");      // modified
  fs.writeFileSync(path.join(repo, "untracked.txt"), "new\n");   // untracked
});
afterAll(() => fs.rmSync(repo, { recursive: true, force: true }));

describe("loadRepoDiff working mode", () => {
  it("returns modified + untracked-as-added", async () => {
    const d = await loadRepoDiff(repo, DiffMode.Working);
    expect(d.error).toBeUndefined();
    const byPath = Object.fromEntries(d.files.map((f) => [f.path, f]));
    expect(byPath["a.txt"].status).toBe(FileStatus.Modified);
    expect(byPath["untracked.txt"].status).toBe(FileStatus.Added);
  });

  it("returns an error for a non-git dir", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nogit-"));
    const d = await loadRepoDiff(tmp, DiffMode.Working);
    expect(d.error).toBeTruthy();
    expect(d.files).toEqual([]);
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run electron/services/__tests__/git.service.test.ts`
Expected: FAIL — `loadRepoDiff` not found.

- [ ] **Step 3: Implement the service**

```ts
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { DiffMode, FileStatus, RepoDiff, RepoFileDiff } from "../../types/git.types";
import { parseUnifiedDiff } from "./git.parse";

const run = promisify(execFile);
const TIMEOUT = 10_000;
const MAX_BUFFER = 16 * 1024 * 1024;

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await run("git", args, { cwd, timeout: TIMEOUT, maxBuffer: MAX_BUFFER });
  return stdout;
}

async function isGitRepo(cwd: string): Promise<boolean> {
  try {
    return (await git(cwd, ["rev-parse", "--is-inside-work-tree"])).trim() === "true";
  } catch {
    return false;
  }
}

/** Untracked files → synthesized `added` RepoFileDiff entries (read-only). */
function untrackedAdds(cwd: string, list: string): RepoFileDiff[] {
  return list
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((rel) => {
      let body = "";
      try { body = fs.readFileSync(path.join(cwd, rel), "utf-8"); } catch { /* binary/unreadable */ }
      const lines = body.length ? body.replace(/\n$/, "").split("\n") : [];
      return {
        path: rel,
        status: FileStatus.Added,
        additions: lines.length,
        deletions: 0,
        binary: false,
        hunks: lines.length
          ? [{
              header: `@@ -0,0 +1,${lines.length} @@`,
              lines: [
                { kind: "hunk" as const, text: `@@ -0,0 +1,${lines.length} @@`, oldLine: null, newLine: null },
                ...lines.map((t, i) => ({ kind: "add" as const, text: t, oldLine: null, newLine: i + 1 })),
              ],
            }]
          : [],
      };
    });
}

async function defaultBase(cwd: string): Promise<string | null> {
  for (const ref of ["origin/HEAD", "main", "master"]) {
    try {
      const out = (await git(cwd, ["rev-parse", "--abbrev-ref", ref])).trim();
      if (out) return out.replace(/^origin\//, "");
    } catch { /* try next */ }
  }
  return null;
}

export async function loadRepoDiff(repoPath: string, mode: DiffMode): Promise<RepoDiff> {
  if (!(await isGitRepo(repoPath))) {
    return { mode, files: [], truncated: false, error: "Not a git repository" };
  }
  try {
    if (mode === DiffMode.Working) {
      const raw = await git(repoPath, ["diff", "HEAD"]);
      const parsed = parseUnifiedDiff(raw);
      const untracked = await git(repoPath, ["ls-files", "--others", "--exclude-standard"]);
      return { mode, files: [...parsed.files, ...untrackedAdds(repoPath, untracked)], truncated: parsed.truncated };
    }
    const base = await defaultBase(repoPath);
    if (!base) return { mode, files: [], truncated: false, error: "No base branch found" };
    const mergeBase = (await git(repoPath, ["merge-base", "HEAD", base])).trim();
    const raw = await git(repoPath, ["diff", `${mergeBase}...HEAD`]);
    const parsed = parseUnifiedDiff(raw);
    return { mode, base, files: parsed.files, truncated: parsed.truncated };
  } catch (err) {
    return { mode, files: [], truncated: false, error: err instanceof Error ? err.message : "git failed" };
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run electron/services/__tests__/git.service.test.ts`
Expected: PASS.

- [ ] **Step 5: Lint + commit**

```bash
npm run lint
git add electron/services/git/git.service.ts electron/services/__tests__/git.service.test.ts
git commit -m "feat(git): read-only repo diff service (working + branch, untracked)"
```

---

## Task 4: IPC `git:diff` (full electron loop)

**Files:**
- Create: `electron/ipc/git.ipc.ts`
- Modify: `electron/ipc/index.ts`, `electron/preload.ts`, `src/env.d.ts`

- [ ] **Step 1: Create the handler**

```ts
// electron/ipc/git.ipc.ts
import { ipcMain } from "electron";
import { loadRepoDiff } from "../services/git/git.service";
import type { DiffMode } from "../types/git.types";

export function registerGitIpc(): void {
  ipcMain.handle("git:diff", (_e, repoPath: string, mode: DiffMode) => loadRepoDiff(repoPath, mode));
}
```

- [ ] **Step 2: Register it** — in `electron/ipc/index.ts`, import `registerGitIpc` and call it alongside the other `register*Ipc()` calls (match the existing pattern in that file).

- [ ] **Step 3: Expose on preload** — in `electron/preload.ts`, add to the `window.api` object:

```ts
gitDiff: (repoPath: string, mode: DiffMode) => ipcRenderer.invoke("git:diff", repoPath, mode),
```
(import `type { DiffMode } from "./types/git.types"` at the top with the other type imports.)

- [ ] **Step 4: Type the contract** — in `src/env.d.ts`, add to the `window.api` interface and re-export the types:

```ts
import type { DiffMode, RepoDiff } from "../electron/types/git.types";
// ...inside the api interface:
gitDiff(repoPath: string, mode: DiffMode): Promise<RepoDiff>;
```
(Follow how `env.d.ts` already imports/re-exports other electron types.)

- [ ] **Step 5: Verify both typechecks**

Run: `npm run typecheck && npm run typecheck:electron`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add electron/ipc/git.ipc.ts electron/ipc/index.ts electron/preload.ts src/env.d.ts
git commit -m "feat(git): git:diff IPC + window.api.gitDiff"
```

---

## Task 5: DiffBlock `hunk` line kind

**Files:**
- Modify: `src/components/Dashboard/ResponseBody/blocks/DiffBlock/diff.types.ts`
- Modify: `src/components/Dashboard/ResponseBody/blocks/DiffBlock/DiffLineRow/DiffLineRow.tsx`, `.../lineStyle.ts`
- Test: extend `src/components/__tests__/Dashboard/ResponseBody/blocks/DiffBlock/DiffBlock.test.tsx`

- [ ] **Step 1: Extend the enum** — in `diff.types.ts`:

```ts
export const LineKind = { Add: 'add', Del: 'del', Context: 'context', Hunk: 'hunk' } as const;
```

- [ ] **Step 2: Write a failing test** — a `FileDiff` containing a `hunk` line renders the header text and shows NO ask button / NO line numbers:

```tsx
it("renders a hunk separator without line numbers or ask button", () => {
  const diff = { filePath: "a.ts", lines: [
    { id: "h", kind: LineKind.Hunk, oldNo: null, newNo: null, text: "@@ -1,2 +1,2 @@" },
  ]};
  render(<DiffBlock diff={diff} toolName="Diff" />);
  expect(screen.getByText("@@ -1,2 +1,2 @@")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /ask/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/components/__tests__/Dashboard/ResponseBody/blocks/DiffBlock/DiffBlock.test.tsx`
Expected: FAIL.

- [ ] **Step 4: Implement** — in `DiffLineRow.tsx`, early-return a hunk row before the normal row: a full-width muted monospace row showing `line.text`, no gutter numbers, no hover ask-icon. In `lineStyle.ts`, add a `hunk` branch to the per-kind style map (muted `--color-text-secondary` on `--color-surface-2`). Keep the value→style map exhaustive (no fallback chain).

- [ ] **Step 5: Run to verify it passes** (and existing DiffBlock tests stay green)

Run: `npx vitest run src/components/__tests__/Dashboard/ResponseBody/blocks/DiffBlock/`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/Dashboard/ResponseBody/blocks/DiffBlock src/components/__tests__/Dashboard/ResponseBody/blocks/DiffBlock
git commit -m "feat(diff): hunk separator line kind in DiffBlock"
```

---

## Task 6: `RepoFileDiff` → `FileDiff` mapper

**Files:**
- Create: `.../UtilityPanel/DiffTab/repoDiffToFileDiff.ts`
- Test: `src/components/__tests__/Dashboard/.../UtilityPanel/DiffTab/repoDiffToFileDiff.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, expect, it } from "vitest";
import { repoFileToFileDiff } from "@/components/Dashboard/Workspace/DashboardArea/Dashboard/UtilityPanel/DiffTab/repoDiffToFileDiff";
import { FileStatus, GitLineKind } from "@/lib/types"; // re-exported via env types barrel

it("flattens hunks into FileDiff lines with stable ids", () => {
  const fd = repoFileToFileDiff({
    path: "a.ts", status: FileStatus.Modified, additions: 1, deletions: 0, binary: false,
    hunks: [{ header: "@@ -1 +1,2 @@", lines: [
      { kind: GitLineKind.Hunk, text: "@@ -1 +1,2 @@", oldLine: null, newLine: null },
      { kind: GitLineKind.Add, text: "x", oldLine: null, newLine: 2 },
    ]}],
  });
  expect(fd.filePath).toBe("a.ts");
  expect(fd.lines).toHaveLength(2);
  expect(new Set(fd.lines.map((l) => l.id)).size).toBe(2); // unique ids
});
```

- [ ] **Step 2: Run to verify it fails** → `npx vitest run .../repoDiffToFileDiff.test.ts` → FAIL.

- [ ] **Step 3: Implement**

```ts
import type { FileDiff } from "@/components/Dashboard/ResponseBody/blocks/DiffBlock/diff.types";
import type { RepoFileDiff } from "@/lib/types";

/** Flatten a git RepoFileDiff's hunks into the DiffBlock FileDiff model. */
export function repoFileToFileDiff(file: RepoFileDiff): FileDiff {
  const lines = file.hunks.flatMap((h, hi) =>
    h.lines.map((l, li) => ({
      id: `${hi}:${li}`,
      kind: l.kind,
      oldNo: l.oldLine,
      newNo: l.newLine,
      text: l.text,
    })),
  );
  return { filePath: file.path, lines };
}
```
(Note: `GitLineKind` values are identical strings to `LineKind` incl. `hunk`, so the kind passes through directly.)

- [ ] **Step 4: Run to verify it passes** → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Dashboard/Workspace/DashboardArea/Dashboard/UtilityPanel/DiffTab/repoDiffToFileDiff.ts src/components/__tests__/Dashboard/Workspace/DashboardArea/Dashboard/UtilityPanel/DiffTab/repoDiffToFileDiff.test.ts
git commit -m "feat(diff): map RepoFileDiff to DiffBlock FileDiff"
```

---

## Task 7: Panel kind + DiffTab body

**Files:**
- Modify: `src/store/dashboard/usePanelStore.ts`
- Create: `.../UtilityPanel/DiffTab/DiffTab.tsx`, `.../DiffTab/DiffModeToggle/DiffModeToggle.tsx`
- Modify: the `TAB_BODY` map (in `DashboardSurface` / UtilityPanel body switch)
- Test: `src/components/__tests__/Dashboard/.../UtilityPanel/DiffTab/DiffTab.test.tsx`

- [ ] **Step 1: Extend the panel store** — in `usePanelStore.ts`:
  - Add `Diff: 'diff'` to `PanelTabKind`.
  - Add `export type DiffPayload = { repoPath: string }`.
  - Add a union member: `| { id: string; kind: typeof PanelTabKind.Diff; title: string; payload: DiffPayload }`.
  - Add to `PayloadByKind`: `[PanelTabKind.Diff]: DiffPayload`.
  - Add `export function diffTabId(repoPath: string): string { return \`diff:${repoPath}\`; }` (identity = repo, like the live views which carry no snapshot).

- [ ] **Step 2: Write a failing test** for DiffTab (mock `window.api.gitDiff`):

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { DiffMode, FileStatus } from "@/lib/types";
import { DiffTab } from "@/components/Dashboard/Workspace/DashboardArea/Dashboard/UtilityPanel/DiffTab/DiffTab";

it("fetches working diff on mount and lists changed files", async () => {
  const gitDiff = vi.fn().mockResolvedValue({
    mode: DiffMode.Working, truncated: false,
    files: [{ path: "a.ts", status: FileStatus.Modified, additions: 1, deletions: 1, binary: false, hunks: [] }],
  });
  vi.stubGlobal("window", Object.assign(window, { api: { gitDiff, transform: vi.fn() } }));
  render(<DiffTab repoPath="/repo" />);
  await waitFor(() => expect(gitDiff).toHaveBeenCalledWith("/repo", DiffMode.Working));
  expect(await screen.findByText("a.ts")).toBeInTheDocument();
});

it("shows the empty state when there are no changes", async () => {
  const gitDiff = vi.fn().mockResolvedValue({ mode: DiffMode.Working, truncated: false, files: [] });
  vi.stubGlobal("window", Object.assign(window, { api: { gitDiff, transform: vi.fn() } }));
  render(<DiffTab repoPath="/repo" />);
  expect(await screen.findByText(/no changes/i)).toBeInTheDocument();
});
```

- [ ] **Step 3: Run to verify it fails** → FAIL (no DiffTab).

- [ ] **Step 4: Implement `DiffModeToggle.tsx`** — a two-button segmented control (Working tree / Branch vs <base>) calling `onChange(mode)`; use existing `_ui` primitives + design tokens. Disable the Branch option (with a title) when `base` is absent.

- [ ] **Step 5: Implement `DiffTab.tsx`**

```tsx
import { useCallback, useEffect, useState } from "react";
import { DiffBlock } from "@/components/Dashboard/ResponseBody/blocks/DiffBlock/DiffBlock";
import { DiffMode, type RepoDiff } from "@/lib/types";
import { DiffModeToggle } from "./DiffModeToggle/DiffModeToggle";
import { repoFileToFileDiff } from "./repoDiffToFileDiff";

export function DiffTab({ repoPath }: { repoPath: string }) {
  const [mode, setMode] = useState<DiffMode>(DiffMode.Working);
  const [diff, setDiff] = useState<RepoDiff | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback((m: DiffMode) => {
    setLoading(true);
    void window.api.gitDiff(repoPath, m).then((d) => setDiff(d)).finally(() => setLoading(false));
  }, [repoPath]);

  useEffect(() => { load(mode); }, [load, mode]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <DiffModeToggle mode={mode} base={diff?.base} onChange={setMode} />
        <div className="flex-1" />
        <button onClick={() => load(mode)} className="text-xs text-fg-muted" title="Refresh">Refresh</button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading && !diff ? <Empty label="Loading…" />
          : diff?.error ? <Empty label={diff.error} />
          : !diff || diff.files.length === 0 ? <Empty label="No changes" />
          : (
            <>
              {diff.truncated ? <p className="px-3 py-1 text-xs text-fg-subtle">Diff truncated</p> : null}
              {diff.files.map((f) => (
                <div key={`${f.oldPath ?? ""}>${f.path}`} className="p-2">
                  <DiffBlock diff={repoFileToFileDiff(f)} toolName={f.status} />
                </div>
              ))}
            </>
          )}
      </div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="flex h-full items-center justify-center text-sm text-fg-subtle">{label}</div>;
}
```

- [ ] **Step 6: Wire into `TAB_BODY`** — add a `[PanelTabKind.Diff]: (tab) => <DiffTab repoPath={tab.payload.repoPath} />` entry to the panel-body value→render map (mirror the existing entries for Table/Code/Agent).

- [ ] **Step 7: Run to verify tests pass** → `npx vitest run src/components/__tests__/Dashboard/.../UtilityPanel/DiffTab/` → PASS.

- [ ] **Step 8: Lint + commit**

```bash
npm run lint
git add src/store/dashboard/usePanelStore.ts "src/components/Dashboard/Workspace/DashboardArea/Dashboard/UtilityPanel/DiffTab" "src/components/__tests__/Dashboard/Workspace/DashboardArea/Dashboard/UtilityPanel/DiffTab" src/components/Dashboard/Workspace/DashboardArea/Dashboard/DashboardSurface
git commit -m "feat(diff): DiffTab panel kind with mode toggle"
```

---

## Task 8: Header "Changes" button

**Files:**
- Modify: `src/components/Dashboard/Header/Header.tsx`
- Test: extend `src/components/__tests__/Dashboard/Header/Header.test.tsx`

The button opens the Diff panel tab for the selected project. It reads `selectedProject` from `useAppStore` and calls `usePanelStore.open` + `setOpen(true)`.

- [ ] **Step 1: Write a failing test** — Header renders a "Changes" button when a project is selected; clicking it calls `usePanelStore.getState().open` with a `kind: 'diff'` tab whose `payload.repoPath` is the selected project's path. (Stub the stores.)

- [ ] **Step 2: Run to verify it fails** → FAIL.

- [ ] **Step 3: Implement** — add a `GitBranch`-icon `Button` (intent ghost/secondary, leftIcon) labeled "Changes" near the existing Chat button. Handler:

```tsx
const selectedProject = useAppStore((s) => s.selectedProject);
const openPanel = usePanelStore((s) => s.open);
// ...
{selectedProject ? (
  <Button intent="ghost" size="sm" leftIcon={<GitBranch size={15} aria-hidden="true" />}
    onClick={() => openPanel({
      id: diffTabId(selectedProject.path), kind: PanelTabKind.Diff,
      title: "Changes", payload: { repoPath: selectedProject.path },
    })}>
    Changes
  </Button>
) : null}
```
(If Header would exceed 300 lines, extract the button into a `HeaderChangesButton/` sub-component.)

- [ ] **Step 4: Run to verify it passes** → `npx vitest run src/components/__tests__/Dashboard/Header/Header.test.tsx` → PASS.

- [ ] **Step 5: Full gate + commit**

```bash
npm run lint && npm run typecheck && npm run typecheck:electron && npx electron-vite build && npm test
git add src/components/Dashboard/Header src/components/__tests__/Dashboard/Header
git commit -m "feat(diff): Header Changes button opens the diff panel"
```

---

## Task 9: Land

- [ ] **Step 1: Land via the repo script** (derives `feat` → minor, gates, merges --no-ff, pushes)

```bash
.claude/hooks/land.sh <branch>
```
Expected: `✓ all gates green`, version bumped, `main -> main` pushed.

---

## Self-review notes (author)

- **Spec coverage:** working+branch toggle (Task 7), UtilityPanel tab (Tasks 5/7), read-only (service uses only `diff`/`ls-files`/`merge-base`/`rev-parse`), DiffBlock + Ask Claude reuse (Tasks 5/6/7 — DiffBlock's `useDiffAsk` is reused unchanged), Header "Changes" entry (Task 8), untracked-as-added (Task 3), hand-rolled parser/zero-dep (Task 2), error/empty/truncated states (Tasks 3/7), tests at every layer.
- **Type consistency:** `GitLineKind` strings (`add/del/context/hunk`) are identical to `LineKind` strings, so the mapper passes `kind` through without translation; `loadRepoDiff(repoPath, mode)` signature is identical in service, IPC, preload, env.d.ts, and DiffTab call site.
- **No placeholders:** parser, service, mapper, DiffTab carry full code; renderer-styling steps (DiffModeToggle, lineStyle hunk branch) describe exact behavior + tokens to follow existing `_ui`/DiffBlock patterns.
