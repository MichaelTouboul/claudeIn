import type { AvatarHue } from '@/components/_ui/Avatar/Avatar';
import type { GitWorktree, WorktreeStat } from '@/lib/types';
import { AgentPresenceStatus, type SessionPresence } from '@/store/dashboard/useEventsStore';
import type { Dashboard } from '@/store/useWorkspaceStore';

/**
 * The finite, authoritative status of a worktree row (CLAUDE.md: enum + behavior
 * map, never a fallback chain). One source of truth derived in `worktreeStatus`,
 * then mapped to its dot/label/filter behavior by the panel.
 */
export const WorktreeStatus = {
  /** A sub-agent is actively present in a session open on this worktree. */
  Running: 'running',
  /** Has divergent work (ahead/uncommitted) and is open, but no active agent. */
  Review: 'review',
  /** Nothing happening here right now (the absent/default case). */
  Idle: 'idle',
} as const;
export type WorktreeStatus = (typeof WorktreeStatus)[keyof typeof WorktreeStatus];

/** The Worktrees panel filter — finite set, mapped to a predicate by the panel. */
export const WorktreeFilter = {
  All: 'all',
  Active: 'active',
  Idle: 'idle',
} as const;
export type WorktreeFilter = (typeof WorktreeFilter)[keyof typeof WorktreeFilter];

/** A fully-derived worktree row, ready to render as a card. */
export interface WorktreeRow {
  /** The worktree path (stable id + diff/agent join key). */
  path: string;
  branch: string;
  /** This row is the repo's CURRENT checked-out worktree. */
  current: boolean;
  status: WorktreeStatus;
  /** The sub-agent actively running here, or null when none. */
  agent: string | null;
  /** Identity hue for the row dot + agent tile, derived from branch/agent name. */
  hue: AvatarHue;
  additions: number;
  deletions: number;
  ahead: number;
}

const HUES: readonly AvatarHue[] = [
  'blue',
  'purple',
  'green',
  'orange',
  'cyan',
  'pink',
  'yellow',
  'red',
];

/** Deterministic identity hue from a name (djb2 → palette index). Stable per name. */
export function hueForName(name: string): AvatarHue {
  let h = 5381;
  for (let i = 0; i < name.length; i++) h = (h * 33) ^ name.charCodeAt(i);
  return HUES[Math.abs(h) % HUES.length];
}

/** claudeSessionIds of every tab across dashboards whose cwd equals `path`. */
function sessionsForPath(dashboards: Dashboard[], path: string): string[] {
  const ids: string[] = [];
  for (const d of dashboards) {
    if (d.cwd !== path) continue;
    for (const t of d.tabs) {
      if (t.claudeSessionId) ids.push(t.claudeSessionId);
      else if (t.sessionId) ids.push(t.sessionId);
    }
  }
  return ids;
}

/**
 * The Active agent running in any session open on `path`, or null. Picks the
 * first Active agent found across the matched sessions — that is the one the card
 * surfaces as "the agent running in it".
 */
export function agentForPath(
  dashboards: Dashboard[],
  presence: SessionPresence,
  path: string,
): string | null {
  for (const sessionId of sessionsForPath(dashboards, path)) {
    const inner = presence.get(sessionId);
    if (!inner) continue;
    for (const [agent, status] of inner) {
      if (status === AgentPresenceStatus.Active) return agent;
    }
  }
  return null;
}

/**
 * Authoritative status for one worktree. Running iff an agent is active in a
 * session open here; else Review iff it is open AND has divergent work; else Idle.
 * `?? Idle` is reserved for the genuine absent case — it is never the primary
 * derivation (CLAUDE.md enum rule).
 */
export function worktreeStatus(
  agent: string | null,
  isOpen: boolean,
  stat: WorktreeStat | undefined,
): WorktreeStatus {
  if (agent) return WorktreeStatus.Running;
  const diverged = (stat?.ahead ?? 0) > 0 || (stat?.additions ?? 0) > 0 || (stat?.deletions ?? 0) > 0;
  if (isOpen && diverged) return WorktreeStatus.Review;
  return WorktreeStatus.Idle;
}

/**
 * Build the panel's card rows from the live worktree list, per-worktree stats,
 * the open dashboards (cwd↔worktree match), and session presence. Pure so the
 * derivation is unit-testable without React.
 */
export function deriveWorktrees(args: {
  worktrees: GitWorktree[];
  current: string | null;
  stats: WorktreeStat[];
  dashboards: Dashboard[];
  presence: SessionPresence;
}): WorktreeRow[] {
  const statByPath = new Map(args.stats.map((s) => [s.path, s]));
  const openPaths = new Set(args.dashboards.map((d) => d.cwd));
  return args.worktrees.map((wt) => {
    const branch = wt.branch ?? '(detached)';
    const agent = agentForPath(args.dashboards, args.presence, wt.path);
    const stat = statByPath.get(wt.path);
    const status = worktreeStatus(agent, openPaths.has(wt.path), stat);
    return {
      path: wt.path,
      branch,
      current: wt.branch !== null && wt.branch === args.current,
      status,
      agent,
      hue: hueForName(agent ?? branch),
      additions: stat?.additions ?? 0,
      deletions: stat?.deletions ?? 0,
      ahead: stat?.ahead ?? 0,
    };
  });
}

/** filter → predicate over a row's status. Exhaustive, no fallback chain. */
export const FILTER_PREDICATE: Record<WorktreeFilter, (s: WorktreeStatus) => boolean> = {
  [WorktreeFilter.All]: () => true,
  [WorktreeFilter.Active]: (s) => s !== WorktreeStatus.Idle,
  [WorktreeFilter.Idle]: (s) => s === WorktreeStatus.Idle,
};

/** Apply the active filter to the rows. */
export function filterWorktrees(rows: WorktreeRow[], filter: WorktreeFilter): WorktreeRow[] {
  return rows.filter((r) => FILTER_PREDICATE[filter](r.status));
}

/** Count of non-idle (active) rows — drives the header/footer "{M} actifs". */
export function activeCount(rows: WorktreeRow[]): number {
  return rows.filter((r) => r.status !== WorktreeStatus.Idle).length;
}
