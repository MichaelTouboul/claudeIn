import type { SkillFile } from '@/hooks/useProjects';

export type SkillOverviewProps = { skill: SkillFile };

export function SkillOverview({ skill }: SkillOverviewProps) {
  const meta = skill.metadata;
  const rows: [string, string][] = [
    ["Description", skill.description],
    ["Scope", skill.scope],
    ["Prompt size", `${skill.lineCount} lines`],
    ...(skill.license ? [["License", skill.license] as [string, string]] : []),
    ...(meta?.author ? [["Author", meta.author] as [string, string]] : []),
    ...(meta?.version ? [["Version", meta.version] as [string, string]] : []),
    ...(meta?.created ? [["Created", meta.created] as [string, string]] : []),
    ...(meta?.last_reviewed ? [["Last reviewed", meta.last_reviewed] as [string, string]] : []),
    ...(skill.annexFiles.length > 0 ? [["Annex files", String(skill.annexFiles.length)] as [string, string]] : []),
  ];

  return (
    <div className="space-y-4">
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-border/50">
              <td className="py-2 pr-4 text-fg-muted font-medium w-40">{label}</td>
              <td className="py-2 text-fg">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-xs text-fg-subtle font-mono">{skill.filePath}</div>
    </div>
  );
}
