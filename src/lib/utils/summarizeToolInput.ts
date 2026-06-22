/**
 * Concise human label for a tool call, derived from its input. Pure + total —
 * returns `null` when nothing sensible can be summarized (the caller renders the
 * tool name alone). This is the renderer twin of the backend
 * `electron/services/session/session.steps.ts#summarizeToolInput`; the two share
 * one set of rules across the process boundary and must stay in sync.
 *
 * Rules: Read/Edit/Write/NotebookEdit → basename of `file_path`; Bash → first
 * ~40 chars of `command` (single line, ellipsized); Grep/Glob → `pattern`;
 * WebFetch → host of `url`; Task → `description` or `subagent_type`.
 */
const FILE_PATH_TOOLS = new Set(['Read', 'Edit', 'Write', 'NotebookEdit']);
const PATTERN_TOOLS = new Set(['Grep', 'Glob']);
const BASH_HEAD_LIMIT = 40;

export function summarizeToolInput(
  tool: string,
  input: Record<string, unknown>,
): string | null {
  if (FILE_PATH_TOOLS.has(tool)) return basename(str(input.file_path));
  if (PATTERN_TOOLS.has(tool)) return str(input.pattern);
  if (tool === 'Bash') return bashHead(str(input.command));
  if (tool === 'WebFetch') return hostOf(str(input.url));
  if (tool === 'Task') return str(input.description) ?? str(input.subagent_type);
  return null;
}

/**
 * Parse a tool message's `content` (JSON of the tool input) and summarize it.
 * Defensive: non-JSON or a non-object payload yields `null` (the activity line
 * then shows the tool name alone).
 */
export function summarizeToolContent(tool: string, content: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  return summarizeToolInput(tool, parsed as Record<string, unknown>);
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function basename(filePath: string | null): string | null {
  if (!filePath) return null;
  const base = filePath.split(/[/\\]/).filter(Boolean).pop();
  return base ?? null;
}

function bashHead(command: string | null): string | null {
  if (!command) return null;
  const single = command.replace(/\s+/g, ' ').trim();
  if (!single) return null;
  return single.length > BASH_HEAD_LIMIT ? `${single.slice(0, BASH_HEAD_LIMIT)}…` : single;
}

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).host || null;
  } catch {
    return null;
  }
}
