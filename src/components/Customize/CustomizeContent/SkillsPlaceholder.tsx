import { Sparkles } from "lucide-react";

// Visual-only placeholder for the Skills section. No business logic — the skills
// browsing/editing flow lands in a later phase (C3+).
export function SkillsPlaceholder() {
  return (
    <section
      data-testid="skills-placeholder"
      aria-label="Skills"
      className="flex-1 h-full flex flex-col items-center justify-center gap-3 p-8 text-center"
    >
      <Sparkles size={28} className="text-active" />
      <h2
        className="text-lg font-semibold"
        style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-sans)" }}
      >
        Skills
      </h2>
      <p className="text-sm max-w-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
        Browse and create reusable skills here. Coming soon.
      </p>
    </section>
  );
}
