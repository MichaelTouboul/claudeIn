import type { SkillFile } from '@/hooks/useProjects';

export type SkillPromptProps = { skill: SkillFile };

export function SkillPrompt({ skill }: SkillPromptProps) {
  return (
    <div className="bg-gray-800/30 rounded-lg p-6 overflow-x-auto">
      <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
        {skill.body}
      </pre>
    </div>
  );
}
