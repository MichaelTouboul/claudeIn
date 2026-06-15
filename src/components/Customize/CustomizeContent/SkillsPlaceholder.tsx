import { Sparkles } from "lucide-react";

// Visual-only placeholder for the Skills section. No business logic — the skills
// browsing/editing flow lands in a later phase (C3+).
export function SkillsPlaceholder() {
  return (
    <section
      data-testid="skills-placeholder"
      aria-label="Skills"
      className="flex-1 h-full flex flex-col items-center justify-center gap-3 px-8 py-7 text-center"
    >
      <span
        className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)]"
        style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
      >
        <Sparkles size={22} className="text-active" aria-hidden="true" />
      </span>
      <h2
        className="text-lg font-semibold tracking-[-0.01em]"
        style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-sans)" }}
      >
        Skills
      </h2>
      <p className="text-sm max-w-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
        Reusable workflows Claude can call on demand. Browse and create them here — coming soon.
      </p>
    </section>
  );
}
