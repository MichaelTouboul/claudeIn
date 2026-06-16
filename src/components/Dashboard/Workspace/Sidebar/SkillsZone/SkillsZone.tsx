import { Search } from 'lucide-react';
import { useState } from 'react';

import { Input } from '@/components/_ui/Input';
import type { SkillSummary } from '@/lib/types';

import { SkillRow } from '../SkillRow/SkillRow';

export type SkillsZoneProps = {
  skills: SkillSummary[];
  selectedSkillPath: string | null;
  onSelectSkill: (s: SkillSummary) => void;
};

/** Narrow a skill list by a case-insensitive substring of the name/description. */
function filterSkills(skills: SkillSummary[], query: string): SkillSummary[] {
  const q = query.trim().toLowerCase();
  if (!q) return skills;
  return skills.filter(
    (s) => s.name.toLowerCase().includes(q) || (s.description ?? '').toLowerCase().includes(q),
  );
}

/**
 * The drilled-in Skills list: a filter input above the redesigned skill rows —
 * the same grammar as AgentsZone (minus scope tabs, which skills don't have).
 */
export function SkillsZone({ skills, selectedSkillPath, onSelectSkill }: SkillsZoneProps) {
  const [query, setQuery] = useState('');
  const visible = filterSkills(skills, query);

  return (
    <div className="flex flex-col min-h-0">
      <div className="px-3 pb-2.5 pt-1">
        <Input
          size="sm"
          placeholder="Filter skills…"
          leadingIcon={<Search size={13} />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Filter skills"
        />
      </div>
      <div className="flex-1 overflow-y-auto pt-0.5 space-y-0.5">
        {visible.length > 0 ? (
          visible.map((s) => (
            <SkillRow
              key={s.filePath}
              skill={s}
              selected={selectedSkillPath === s.filePath}
              onSelect={onSelectSkill}
            />
          ))
        ) : (
          <p className="px-3 py-6 text-center text-xs text-fg-muted">
            {skills.length > 0 ? 'No matching skills' : 'No skills'}
          </p>
        )}
      </div>
    </div>
  );
}
