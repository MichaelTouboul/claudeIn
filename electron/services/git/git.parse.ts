import {
  FileStatus,
  type GitDiffHunk,
  type GitDiffLine,
  GitLineKind,
  type RepoFileDiff,
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

function toBodyLine(line: string, oldNo: number, newNo: number): GitDiffLine | null {
  const c = line[0];
  const text = line.slice(1);
  if (c === "+") return { kind: GitLineKind.Add, text, oldLine: null, newLine: newNo };
  if (c === "-") return { kind: GitLineKind.Del, text, oldLine: oldNo, newLine: null };
  if (c === " ") return { kind: GitLineKind.Context, text, oldLine: oldNo, newLine: newNo };
  return null; // blank trailing lines etc.
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
    } else if (
      line.startsWith("--- ") ||
      line.startsWith("+++ ") ||
      line.startsWith("index ")
    ) {
      continue; // file headers — paths already taken from `diff --git`
    } else {
      const h = line.match(HUNK_RE);
      if (h) {
        oldNo = Number(h[1]);
        newNo = Number(h[2]);
        cur = {
          header: line,
          lines: [{ kind: GitLineKind.Hunk, text: line, oldLine: null, newLine: null }],
        };
        hunks.push(cur);
      } else if (cur && emitted < maxLines) {
        if (line.startsWith("\\")) continue; // "\ No newline at end of file"
        const body = toBodyLine(line, oldNo, newNo);
        if (!body) continue;
        if (body.kind === GitLineKind.Add) {
          newNo++;
          additions++;
        } else if (body.kind === GitLineKind.Del) {
          oldNo++;
          deletions++;
        } else {
          oldNo++;
          newNo++;
        }
        cur.lines.push(body);
        emitted++;
      }
    }
  }
  return {
    path,
    oldPath: oldPath && oldPath !== path ? oldPath : undefined,
    status,
    additions,
    deletions,
    binary,
    hunks,
  };
}

export function parseUnifiedDiff(diff: string, opts: ParseOptions = {}): ParseResult {
  const maxFiles = opts.maxFiles ?? 500;
  const maxLines = opts.maxLinesPerFile ?? 4000;
  const sections = splitFiles(diff);
  const capped = sections.slice(0, maxFiles);
  const files = capped.map((s) => parseSection(s, maxLines));
  return { files, truncated: sections.length > capped.length };
}
