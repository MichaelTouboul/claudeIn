// @vitest-environment node
import { describe, expect, it } from "vitest";

import { FileStatus, GitLineKind } from "../../types/git.types";
import { parseUnifiedDiff } from "../git/git.parse";

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
