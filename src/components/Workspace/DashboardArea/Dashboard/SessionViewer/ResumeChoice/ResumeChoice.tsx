import { Play, Sparkles } from "lucide-react";

export type ResumeChoiceProps = {
  onContinue: () => void;
};

/**
 * Terminal-style resume offer shown atop a transcript. "Continue as is" resumes
 * the session into a live chat (plain `claude --resume <id>`). "Compact
 * (recommended)" is intentionally disabled: compact-on-resume is NOT a trivial
 * CLI flag (Claude Code compaction is the in-session `/compact` command, not a
 * `--resume` option), so per the design's reserve it ships as a follow-up rather
 * than being faked. See SessionViewer for the wiring.
 */
export function ResumeChoice({ onContinue }: ResumeChoiceProps) {
  return (
    <div
      className="px-4 py-2.5 border-b shrink-0 flex items-center gap-2"
      style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-surface-1)" }}
    >
      <span className="text-xs mr-1" style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-sans)" }}>
        Resume this session:
      </span>

      <button
        type="button"
        disabled
        title="Compact-on-resume is not yet available — follow-up"
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md cursor-not-allowed opacity-50"
        style={{
          color: "var(--color-text-muted)",
          background: "var(--color-surface-2)",
          border: "1px solid var(--color-border-subtle)",
        }}
      >
        <Sparkles size={12} />
        Compact (recommended)
        <span className="text-[9px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
          soon
        </span>
      </button>

      <button
        type="button"
        onClick={onContinue}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors"
        style={{
          color: "var(--color-accent)",
          background: "var(--color-accent-dim)",
          border: "1px solid rgba(6,182,212,0.2)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(6,182,212,0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--color-accent-dim)";
        }}
      >
        <Play size={12} />
        Continue as is
      </button>
    </div>
  );
}
