import type { SkillFile } from '@/hooks/useProjects';

export type SkillFilesProps = { skill: SkillFile };

export function SkillFiles({ skill }: SkillFilesProps) {
  if (skill.annexFiles.length === 0) {
    return <p className="text-sm text-fg-muted">No additional files in this skill directory.</p>;
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "—";
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="space-y-1">
      {skill.annexFiles.map((f) => (
        <div key={f.name} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-2/30">
          <span className={`text-xs ${f.isDirectory ? "text-accent" : "text-fg-muted"}`}>
            {f.isDirectory ? "📁" : "📄"}
          </span>
          <span className="text-sm text-fg font-mono flex-1">{f.name}</span>
          <span className="text-xs text-fg-subtle">{f.isDirectory ? "dir" : formatSize(f.size)}</span>
        </div>
      ))}
    </div>
  );
}
