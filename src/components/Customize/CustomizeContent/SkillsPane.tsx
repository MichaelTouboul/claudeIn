import { Sparkles } from "lucide-react";

import { Badge } from "@/components/_ui/Badge";
import { useSkillsMirror } from "@/hooks/useEcosystemMirrors";
import type { SkillSummary } from "@/lib/types";

import { PaneEmpty, PaneLoading, PaneShell } from "./PaneShell";

function SkillCard({ skill }: { skill: SkillSummary }) {
  return (
    <div
      className="flex flex-col gap-2 rounded-[var(--radius-md)] border p-4"
      style={{ background: "var(--color-surface-1)", borderColor: "var(--color-border)" }}
    >
      <span className="flex" style={{ color: "var(--color-active)" }}>
        <Sparkles size={18} aria-hidden="true" />
      </span>
      <div
        className="text-sm font-semibold"
        style={{ fontFamily: "var(--font-mono)", color: "var(--color-text-primary)" }}
      >
        {skill.name}
      </div>
      <div
        className="text-[13px] leading-relaxed"
        style={{ color: "var(--color-text-muted)" }}
      >
        {skill.description || "No description"}
      </div>
      <Badge variant="gray" className="self-start">
        {skill.scope}
      </Badge>
    </div>
  );
}

// Skills section: a responsive card grid of the reconciled user+project skills
// for the active repo scope. Live via `useSkillsMirror`.
export function SkillsPane({ repoScope }: { repoScope: string | null }) {
  const { status, skills } = useSkillsMirror(repoScope);
  return (
    <PaneShell title="Skills" description="Reusable workflows Claude can call on demand.">
      {status === "loading" ? (
        <PaneLoading label="Loading skills…" />
      ) : skills.length === 0 ? (
        <PaneEmpty message="No skills in this scope yet." />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3.5">
          {skills.map((skill) => (
            <SkillCard key={`${skill.scope}:${skill.name}`} skill={skill} />
          ))}
        </div>
      )}
    </PaneShell>
  );
}
