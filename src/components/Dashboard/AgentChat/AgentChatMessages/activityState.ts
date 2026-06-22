import { summarizeToolInput } from '@/lib/utils';

/**
 * The current activity of the live turn, tracked in AgentChat and rendered by the
 * single replacing activity line. `tool` is the latest streamed tool name;
 * `target` its concise label (null when nothing sensible). `null` means no tool
 * has streamed yet this turn (assistant reasoning) → "Thinking…".
 */
export type CurrentActivity = { tool: string; target: string | null } | null;

/** The finite states the activity line can be in — authoritative, no fallback chain. */
export const ActivityLineState = {
  /** The line is hidden (turn not awaiting a response). */
  Idle: 'idle',
  /** Awaiting, no tool yet this turn → "Thinking…". */
  Thinking: 'thinking',
  /** Awaiting, a tool is streaming → verb + target. */
  Tool: 'tool',
} as const;
export type ActivityLineState = (typeof ActivityLineState)[keyof typeof ActivityLineState];

/**
 * Derive the line's finite state from the two authoritative inputs. `active` is
 * the "turn is awaiting a response and not blocked on input" flag; `activity` is
 * the latest streamed tool (or null for reasoning). One total mapping, no chained
 * `?:` over mixed sources.
 */
export function resolveActivityLineState(
  active: boolean,
  activity: CurrentActivity,
): ActivityLineState {
  if (!active) return ActivityLineState.Idle;
  if (activity) return ActivityLineState.Tool;
  return ActivityLineState.Thinking;
}

/** Per-tool verb for the activity label (e.g. `Reading file.ts`, `Running Bash`). */
const TOOL_VERB: Record<string, string> = {
  Read: 'Reading',
  Edit: 'Editing',
  Write: 'Writing',
  NotebookEdit: 'Editing',
  Bash: 'Running',
  Grep: 'Searching',
  Glob: 'Searching',
  WebFetch: 'Fetching',
  Task: 'Delegating',
};

/**
 * Concise human label for a tool activity: `<verb> <target>` when a target is
 * known (`Reading social-trends.service.ts`), else `<verb> <tool>` /
 * `Running Bash`. A target-less verb defaults to the tool name as the object.
 */
export function toolActivityLabel(tool: string, target: string | null): string {
  const verb = TOOL_VERB[tool] ?? 'Running';
  if (target) {
    // Grep/Glob read more naturally quoted: Searching "pattern".
    if (tool === 'Grep' || tool === 'Glob') return `${verb} "${target}"`;
    return `${verb} ${target}`;
  }
  return `${verb} ${tool}`;
}

/** Build a {@link CurrentActivity} from a tool spawn_message's name + content JSON. */
export function activityFromToolMessage(toolName: string, content: string): CurrentActivity {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { tool: toolName, target: null };
  }
  const input = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  return { tool: toolName, target: summarizeToolInput(toolName, input) };
}
