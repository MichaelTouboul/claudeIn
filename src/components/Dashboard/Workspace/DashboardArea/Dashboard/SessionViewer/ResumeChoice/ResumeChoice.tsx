import { Play, Sparkles } from "lucide-react";

import type { ResumeRecommendation } from "./resumeRecommendation";

export type ResumeChoiceProps = {
  onContinue: () => void;
  onCompact: () => void;
  /** Which option is styled as the default and carries the "(recommended)" tag. */
  recommended: ResumeRecommendation;
};

/**
 * Terminal-style resume offer shown atop a transcript. "Compact" resumes the
 * real session (`claude --resume <id>`) and first runs an automatic in-session
 * `/compact` turn to shrink the context; "Continue as is" resumes without
 * compacting. Which one is *recommended* (accent styling + "(recommended)" tag)
 * is decided by `recommended` — heavy conversations get compact, light ones get
 * continue, mirroring terminal Claude Code (which never auto-suggests compact).
 * The compact-on-resume flow itself lives in AgentChat (`compactOnResume`).
 */
export function ResumeChoice({ onContinue, onCompact, recommended }: ResumeChoiceProps) {
  const compactRecommended = recommended === "compact";
  const continueRecommended = recommended === "continue";

  const recommendedStyle = {
    color: "var(--color-accent)",
    background: "var(--color-accent-dim)",
    border: "1px solid rgba(129, 140, 248,0.2)",
  } as const;
  const recommendedHover = "rgba(129, 140, 248,0.2)";
  const secondaryStyle = {
    color: "var(--color-text-secondary)",
    background: "var(--color-surface-2)",
    border: "1px solid var(--color-border-subtle)",
  } as const;
  const secondaryHover = "var(--color-surface-3)";

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
        onClick={onCompact}
        title="Resume and compact the context first, then continue"
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors"
        style={compactRecommended ? recommendedStyle : secondaryStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = compactRecommended ? recommendedHover : secondaryHover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = compactRecommended
            ? recommendedStyle.background
            : secondaryStyle.background;
        }}
      >
        <Sparkles size={12} />
        {compactRecommended ? "Compact (recommended)" : "Compact"}
      </button>

      <button
        type="button"
        onClick={onContinue}
        title="Resume without compacting the context"
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors"
        style={continueRecommended ? recommendedStyle : secondaryStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = continueRecommended ? recommendedHover : secondaryHover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = continueRecommended
            ? recommendedStyle.background
            : secondaryStyle.background;
        }}
      >
        <Play size={12} />
        {continueRecommended ? "Continue as is (recommended)" : "Continue as is"}
      </button>
    </div>
  );
}
