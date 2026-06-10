import type { BadgeVariant } from "@/components/_ui/Badge";

/**
 * Per-scope ingestion lifecycle. Authoritative finite state — drives the
 * IngestStep presentation via the behavior map below (no fallback chains).
 */
export const IngestStatus = {
  Pending: "pending",
  Running: "running",
  Done: "done",
  Error: "error",
} as const;
export type IngestStatus = (typeof IngestStatus)[keyof typeof IngestStatus];

export type IngestStatusPresentation = {
  /** Human label shown next to the scope row. */
  label: string;
  /** Badge color token from the design system. */
  variant: BadgeVariant;
  /** Whether this state is still in flight (spinner shown). */
  busy: boolean;
  /** Whether this state is terminal (done or error). */
  terminal: boolean;
};

/** Every IngestStatus value has an explicit entry — no `?? default` derivation. */
export const INGEST_STATUS_PRESENTATION: Record<IngestStatus, IngestStatusPresentation> = {
  [IngestStatus.Pending]: { label: "Pending", variant: "gray", busy: false, terminal: false },
  [IngestStatus.Running]: { label: "Ingesting…", variant: "cyan", busy: true, terminal: false },
  [IngestStatus.Done]: { label: "Done", variant: "green", busy: false, terminal: true },
  [IngestStatus.Error]: { label: "Failed", variant: "red", busy: false, terminal: true },
};
