import { diffLines } from 'diff';

import { type DiffLine, type FileDiff, LineKind } from './diff.types';

/** The edit tools whose JSON input we can render as a diff. */
const EditTool = { Edit: 'Edit', Write: 'Write', MultiEdit: 'MultiEdit' } as const;
type EditTool = (typeof EditTool)[keyof typeof EditTool];

function isEditTool(name: string): name is EditTool {
  return name === EditTool.Edit || name === EditTool.Write || name === EditTool.MultiEdit;
}

type EditPayload = { file_path?: unknown; old_string?: unknown; new_string?: unknown };
type WritePayload = { file_path?: unknown; content?: unknown };
type MultiEditPayload = { file_path?: unknown; edits?: unknown };

function parseJson(contentJson: string): unknown {
  try {
    return JSON.parse(contentJson);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** diffLines keeps a trailing newline on each chunk; split into bare lines. */
function chunkToLines(value: string): string[] {
  const trimmed = value.endsWith('\n') ? value.slice(0, -1) : value;
  return trimmed.split('\n');
}

/** A line cursor carried across MultiEdit hunks. */
type Cursor = { oldNo: number; newNo: number };

/** Diff two strings, appending lines to `acc` and advancing the cursor. */
function diffInto(oldStr: string, newStr: string, acc: DiffLine[], cursor: Cursor): void {
  for (const part of diffLines(oldStr, newStr)) {
    const lines = chunkToLines(part.value);
    for (const text of lines) {
      if (part.added) {
        acc.push({ kind: LineKind.Add, oldNo: null, newNo: cursor.newNo, text });
        cursor.newNo += 1;
      } else if (part.removed) {
        acc.push({ kind: LineKind.Del, oldNo: cursor.oldNo, newNo: null, text });
        cursor.oldNo += 1;
      } else {
        acc.push({ kind: LineKind.Context, oldNo: cursor.oldNo, newNo: cursor.newNo, text });
        cursor.oldNo += 1;
        cursor.newNo += 1;
      }
    }
  }
}

function parseEdit(payload: EditPayload): FileDiff | null {
  if (
    typeof payload.file_path !== 'string' ||
    typeof payload.old_string !== 'string' ||
    typeof payload.new_string !== 'string'
  ) {
    return null;
  }
  const lines: DiffLine[] = [];
  diffInto(payload.old_string, payload.new_string, lines, { oldNo: 1, newNo: 1 });
  return { filePath: payload.file_path, lines };
}

function parseWrite(payload: WritePayload): FileDiff | null {
  if (typeof payload.file_path !== 'string' || typeof payload.content !== 'string') {
    return null;
  }
  const lines: DiffLine[] = chunkToLines(payload.content).map((text, i) => ({
    kind: LineKind.Add,
    oldNo: null,
    newNo: i + 1,
    text,
  }));
  return { filePath: payload.file_path, lines };
}

function parseMultiEdit(payload: MultiEditPayload): FileDiff | null {
  if (typeof payload.file_path !== 'string' || !Array.isArray(payload.edits)) {
    return null;
  }
  const lines: DiffLine[] = [];
  const cursor: Cursor = { oldNo: 1, newNo: 1 };
  for (const edit of payload.edits) {
    if (!isRecord(edit) || typeof edit.old_string !== 'string' || typeof edit.new_string !== 'string') {
      return null;
    }
    diffInto(edit.old_string, edit.new_string, lines, cursor);
  }
  return { filePath: payload.file_path, lines };
}

const parserByTool: Record<EditTool, (payload: Record<string, unknown>) => FileDiff | null> = {
  [EditTool.Edit]: parseEdit,
  [EditTool.Write]: parseWrite,
  [EditTool.MultiEdit]: parseMultiEdit,
};

/**
 * Parse an edit-tool message's JSON input into a renderable unified FileDiff.
 * Returns null for non-edit tools or malformed/incomplete input so callers can
 * fall back to the raw `<pre>` rendering.
 */
export function parseEditTool(toolName: string, contentJson: string): FileDiff | null {
  if (!isEditTool(toolName)) return null;
  const payload = parseJson(contentJson);
  if (!isRecord(payload)) return null;
  return parserByTool[toolName](payload);
}
