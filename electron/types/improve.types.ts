/**
 * Self-Improve loop — Inbox (I1) shared types.
 *
 * An `ImproveRequest` is a single self-improvement task the user submits from
 * the app. Each request is persisted as one `<id>.json` file in the inbox dir
 * (`~/.claude-agent-manager/improve-inbox/`); the file on disk is the single
 * source of truth. A Claude Code `/loop` watcher consumes pending requests,
 * runs the dev-loop, then writes back a terminal status (see
 * `docs/self-improve/runner-contract.md`).
 */

/** The kind of improvement requested. Finite set; drives prompt/labelling. */
export const ImproveType = {
  Feature: "feature",
  Bug: "bug",
  Design: "design",
  Performance: "performance",
  Copy: "copy",
} as const;
export type ImproveType = (typeof ImproveType)[keyof typeof ImproveType];

/** Lifecycle of a request. `pending` until the runner reaches a terminal state. */
export const ImproveStatus = {
  Pending: "pending",
  Merged: "merged",
  Failed: "failed",
} as const;
export type ImproveStatus = (typeof ImproveStatus)[keyof typeof ImproveStatus];

/** One turn of the originating conversation/transcript attached to a request. */
export interface ImproveTranscriptTurn {
  role: string;
  text: string;
}

/** A single self-improvement request, persisted as one JSON file. */
export interface ImproveRequest {
  id: string;
  createdAt: string;
  type: ImproveType;
  component?: string;
  sourcePath?: string;
  title: string;
  description: string;
  acceptance: string[];
  transcript: ImproveTranscriptTurn[];
  status: ImproveStatus;
  commit?: string;
  summary?: string;
  failureReason?: string;
}

/** Caller-supplied fields when submitting a request (server mints the rest). */
export interface ImproveRequestInput {
  type: ImproveType;
  title: string;
  description: string;
  acceptance: string[];
  component?: string;
  sourcePath?: string;
  transcript?: ImproveTranscriptTurn[];
}

/** Mergeable patch the runner writes to drive a request to a terminal status. */
export type ImproveStatusPatch = Partial<
  Pick<ImproveRequest, "status" | "commit" | "summary" | "failureReason">
>;

/**
 * The component context captured for the right-click "Improve this…" entry (I3).
 * Resolved by the renderer (`elementToComponent`) from the clicked element's
 * dev-only `data-component` / `data-source` attributes, then passed to the main
 * process to build the native context menu. Both fields are optional: a clicked
 * element may resolve only a component name (no nearby `data-source`), and `null`
 * is sent when nothing is annotated (still allows a general improve).
 */
export interface ImproveContextTarget {
  component?: string;
  sourcePath?: string;
}

/**
 * Payload the renderer sends to open the native context menu (I3). `isDev` gates
 * the "Improve this…" item (the source attributes only exist in dev builds).
 */
export interface ContextMenuRequest {
  target: ImproveContextTarget | null;
  isDev: boolean;
}
